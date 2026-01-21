import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import { generatePostForDate, getCommitCountForDate } from "@/lib/generate";
import { getHolidaysInRange } from "@/lib/holidays";
import { parseISO, eachDayOfInterval, format } from "date-fns";

interface SkippedDay {
  date: string;
  reason: "holiday" | "low_commits" | "already_exists" | "error";
}

interface ProcessedDay {
  date: string;
  postId: string;
  commitsCollected: number;
}

interface ProgressEvent {
  type: "progress" | "complete" | "error";
  data: {
    current?: number;
    total?: number;
    currentDate?: string;
    status?: string;
    results?: ProcessedDay[];
    skippedDays?: SkippedDay[];
    processedDays?: number;
    error?: string;
  };
}

function createSSEMessage(event: ProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: "Unauthorized" },
      }),
      {
        status: 401,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  const body = await request.json();
  const {
    startDate: startDateStr,
    endDate: endDateStr,
    excludeHolidays = true,
    minCommitCount = 5,
    forceRegenerate = false,
  } = body;

  if (!startDateStr || !endDateStr) {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: "startDate와 endDate 파라미터가 필요합니다." },
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: "유효하지 않은 날짜 형식입니다." },
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const effectiveEndDate = endDate > today ? today : endDate;

  if (startDate > effectiveEndDate) {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: "시작 날짜가 종료 날짜보다 클 수 없습니다." },
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  const dates = eachDayOfInterval({
    start: startDate,
    end: effectiveEndDate,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(createSSEMessage(event)));
      };

      try {
        const holidays = excludeHolidays
          ? await getHolidaysInRange(startDate, effectiveEndDate)
          : new Set<string>();

        const skippedDays: SkippedDay[] = [];
        const results: ProcessedDay[] = [];
        const total = dates.length;

        for (let i = 0; i < dates.length; i++) {
          const date = dates[i];
          const dateKey = format(date, "yyyy-MM-dd");
          const current = i + 1;

          // 진행률 전송
          send({
            type: "progress",
            data: {
              current,
              total,
              currentDate: dateKey,
              status: "processing",
            },
          });

          // 1. 공휴일 체크
          if (excludeHolidays && holidays.has(dateKey)) {
            skippedDays.push({ date: dateKey, reason: "holiday" });
            continue;
          }

          // 2. 커밋 수 체크
          try {
            const commitCount = await getCommitCountForDate(date);

            if (commitCount < minCommitCount) {
              skippedDays.push({ date: dateKey, reason: "low_commits" });
              continue;
            }

            // 3. 포스트 생성
            const result = await generatePostForDate(date, forceRegenerate);

            if (result.skipped && !forceRegenerate) {
              skippedDays.push({ date: dateKey, reason: "already_exists" });
              continue;
            }

            if (result.success && result.postId) {
              results.push({
                date: dateKey,
                postId: result.postId,
                commitsCollected: result.commitsCollected,
              });
            } else {
              skippedDays.push({ date: dateKey, reason: "error" });
            }
          } catch (error) {
            console.error(`Error processing date ${dateKey}:`, error);
            skippedDays.push({ date: dateKey, reason: "error" });
          }
        }

        // 완료 이벤트 전송
        send({
          type: "complete",
          data: {
            current: total,
            total,
            processedDays: results.length,
            results,
            skippedDays,
          },
        });
      } catch (error) {
        console.error("Batch generate stream error:", error);
        send({
          type: "error",
          data: { error: "배치 생성 중 오류가 발생했습니다." },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
