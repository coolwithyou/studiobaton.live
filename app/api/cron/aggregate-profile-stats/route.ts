/**
 * 프로필 통계 일일 집계 Cron Job
 * 매일 00:10 KST (15:10 UTC)에 실행
 *
 * 전날 커밋 데이터를 기반으로 MemberDailyActivity 및 MemberProfileStats를 업데이트합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { startOfDayKST, subDaysKST, nowKST } from "@/lib/date-utils";
import { aggregateAllMembersForDate } from "@/lib/profile-stats";

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 전날 날짜 (KST 기준)
    const yesterday = startOfDayKST(subDaysKST(nowKST(), 1));

    // 전날 활동 집계
    const { processed, skipped } = await aggregateAllMembersForDate(yesterday);

    return NextResponse.json({
      success: true,
      date: yesterday.toISOString(),
      membersProcessed: processed,
      membersSkipped: skipped,
    });
  } catch (error) {
    console.error("Aggregate profile stats error:", error);
    return NextResponse.json(
      { error: "프로필 통계 집계 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
