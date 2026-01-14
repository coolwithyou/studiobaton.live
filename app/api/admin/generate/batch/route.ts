import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { error: "startDate와 endDate 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const startDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요." },
        { status: 400 }
      );
    }

    // 미래 날짜는 오늘까지로 제한
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const effectiveEndDate = endDate > today ? today : endDate;

    if (startDate > effectiveEndDate) {
      return NextResponse.json(
        { error: "시작 날짜가 종료 날짜보다 클 수 없습니다." },
        { status: 400 }
      );
    }

    // 날짜 범위 내의 모든 날짜 생성
    const dates = eachDayOfInterval({
      start: startDate,
      end: effectiveEndDate,
    });

    // 공휴일 조회 (excludeHolidays가 true일 경우)
    const holidays = excludeHolidays
      ? await getHolidaysInRange(startDate, effectiveEndDate)
      : new Set<string>();

    const skippedDays: SkippedDay[] = [];
    const results: ProcessedDay[] = [];

    for (const date of dates) {
      const dateKey = format(date, "yyyy-MM-dd");

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

    return NextResponse.json({
      success: true,
      totalDays: dates.length,
      processedDays: results.length,
      skippedDays,
      results,
    });
  } catch (error) {
    console.error("Batch generate posts error:", error);
    return NextResponse.json(
      { error: "배치 포스트 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
