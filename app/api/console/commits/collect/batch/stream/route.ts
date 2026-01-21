import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import { collectCommitsForDate } from "@/lib/generate";
import { getHolidaysInRange } from "@/lib/holidays";
import { parseISO, eachDayOfInterval, format } from "date-fns";

interface SkippedDay {
  date: string;
  reason: "holiday" | "low_commits" | "no_commits" | "error";
}

interface ProcessedDay {
  date: string;
  postId: string;
  newCommitsCount: number;
  totalCommitsCount: number;
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
    totalCommitsCount?: number;
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
    minCommitCount = 0,
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
        let totalCommitsCount = 0;

        for (let i = 0; i < dates.length; i++) {
          const date = dates[i];
          const dateKey = format(date, "yyyy-MM-dd");
          const current = i + 1;

          send({
            type: "progress",
            data: {
              current,
              total,
              currentDate: dateKey,
              status: "collecting",
            },
          });

          if (excludeHolidays && holidays.has(dateKey)) {
            skippedDays.push({ date: dateKey, reason: "holiday" });
            continue;
          }

          try {
            const result = await collectCommitsForDate(date);

            if (!result.success) {
              if (result.error?.includes("커밋이 없습니다")) {
                skippedDays.push({ date: dateKey, reason: "no_commits" });
              } else {
                skippedDays.push({ date: dateKey, reason: "error" });
              }
              continue;
            }

            if (result.totalCommitsCount < minCommitCount) {
              skippedDays.push({ date: dateKey, reason: "low_commits" });
              continue;
            }

            if (result.postId) {
              results.push({
                date: dateKey,
                postId: result.postId,
                newCommitsCount: result.newCommitsCount,
                totalCommitsCount: result.totalCommitsCount,
              });
              totalCommitsCount += result.totalCommitsCount;
            }
          } catch (error) {
            console.error(`Error collecting commits for ${dateKey}:`, error);
            skippedDays.push({ date: dateKey, reason: "error" });
          }
        }

        send({
          type: "complete",
          data: {
            current: total,
            total,
            processedDays: results.length,
            results,
            skippedDays,
            totalCommitsCount,
          },
        });
      } catch (error) {
        console.error("Batch collect stream error:", error);
        send({
          type: "error",
          data: { error: "배치 수집 중 오류가 발생했습니다." },
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
