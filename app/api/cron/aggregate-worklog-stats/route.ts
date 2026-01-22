/**
 * 업무일지 통계 집계 Cron Job
 * 하루 4회 실행 (06:00, 12:00, 18:00, 00:00 KST)
 *
 * 최근 7일간의 업무일지 통계를 집계하여 WorkLogDailyStats 테이블에 캐싱합니다.
 * 이를 통해 주간/월간/연간 뷰의 로딩 성능을 개선합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { aggregateRecentDays, aggregateAllMembersForDate } from "@/lib/worklog-stats";
import { startOfDayKST, subDaysKST, nowKST } from "@/lib/date-utils";

export const maxDuration = 60; // 최대 60초

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 최근 7일간 통계 집계 (당일 포함)
    const { totalProcessed, totalSkipped } = await aggregateRecentDays(7);

    return NextResponse.json({
      success: true,
      daysAggregated: 7,
      totalProcessed,
      totalSkipped,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Aggregate worklog stats error:", error);
    return NextResponse.json(
      { error: "업무일지 통계 집계 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 수동 트리거 또는 전체 재집계용 POST 엔드포인트
 */
export async function POST(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const days = body.days || 30; // 기본 30일

    const { totalProcessed, totalSkipped } = await aggregateRecentDays(days);

    return NextResponse.json({
      success: true,
      daysAggregated: days,
      totalProcessed,
      totalSkipped,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Aggregate worklog stats error:", error);
    return NextResponse.json(
      { error: "업무일지 통계 집계 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
