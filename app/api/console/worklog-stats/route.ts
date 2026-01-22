/**
 * 업무일지 캐시 통계 조회 API
 * 캐싱된 WorkLogDailyStats 데이터를 조회합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { getYearStats, getMonthStats, getCachedStats } from "@/lib/worklog-stats";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek } from "date-fns";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const memberId = searchParams.get("memberId");
  const type = searchParams.get("type") || "year"; // year | month | week | range
  const dateStr = searchParams.get("date");

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  // 멤버 확인
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, githubName: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const date = dateStr ? new Date(dateStr) : new Date();

  try {
    switch (type) {
      case "year": {
        const stats = await getYearStats(memberId, date.getFullYear());
        return NextResponse.json(stats);
      }

      case "month": {
        const stats = await getMonthStats(memberId, date);
        return NextResponse.json({ days: stats });
      }

      case "week": {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        const now = new Date();
        const actualEnd = weekEnd > now ? now : weekEnd;
        const stats = await getCachedStats(memberId, weekStart, actualEnd);
        return NextResponse.json({ days: stats });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching worklog stats:", error);
    return NextResponse.json(
      { error: "통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
