/**
 * 프로필 통계 집계 API
 * POST /api/admin/profile-commits/aggregate
 *
 * 수집된 커밋 데이터를 기반으로 MemberDailyActivity 및 MemberProfileStats를 업데이트합니다.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import {
  rebuildMemberStats,
  aggregateAllMembersForDate,
} from "@/lib/profile-stats";
import { parseISO, eachDayOfInterval } from "date-fns";

interface AggregateResult {
  memberId: string;
  memberName: string;
  status: "success" | "error";
  error?: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 관리자 권한 확인
  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email! },
  });

  if (!admin || admin.role !== "ADMIN") {
    return Response.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { mode = "full", memberId, startDate, endDate } = body;

  try {
    const results: AggregateResult[] = [];

    if (mode === "full") {
      // 전체 멤버의 전체 기간 재집계
      const members = await prisma.member.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
      });

      for (const member of members) {
        try {
          await rebuildMemberStats(member.id, member.email);
          results.push({
            memberId: member.id,
            memberName: member.name,
            status: "success",
          });
        } catch (error) {
          results.push({
            memberId: member.id,
            memberName: member.name,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } else if (mode === "member" && memberId) {
      // 특정 멤버만 재집계
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, name: true, email: true },
      });

      if (!member) {
        return Response.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
      }

      try {
        await rebuildMemberStats(member.id, member.email);
        results.push({
          memberId: member.id,
          memberName: member.name,
          status: "success",
        });
      } catch (error) {
        results.push({
          memberId: member.id,
          memberName: member.name,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (mode === "date" && startDate && endDate) {
      // 특정 기간의 모든 멤버 집계
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return Response.json(
          { error: "유효하지 않은 날짜 형식입니다." },
          { status: 400 }
        );
      }

      const dates = eachDayOfInterval({ start, end });
      let totalProcessed = 0;
      let totalSkipped = 0;

      for (const date of dates) {
        const { processed, skipped } = await aggregateAllMembersForDate(date);
        totalProcessed += processed;
        totalSkipped += skipped;
      }

      return Response.json({
        success: true,
        mode: "date",
        daysProcessed: dates.length,
        membersProcessed: totalProcessed,
        membersSkipped: totalSkipped,
      });
    } else {
      return Response.json(
        { error: "유효하지 않은 요청 파라미터입니다." },
        { status: 400 }
      );
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return Response.json({
      success: true,
      mode,
      totalMembers: results.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("Aggregate error:", error);
    return Response.json(
      { error: "집계 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 집계 상태 조회
 */
export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 멤버별 집계 상태 조회
    const members = await prisma.member.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        profileStats: {
          select: {
            totalCommits: true,
            activeDays: true,
            currentStreak: true,
            longestStreak: true,
            lastAggregatedAt: true,
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    // 전체 일일 활동 레코드 수
    const totalDailyActivities = await prisma.memberDailyActivity.count();

    // 마지막 집계 시간
    const latestStats = await prisma.memberProfileStats.findFirst({
      orderBy: { lastAggregatedAt: "desc" },
      select: { lastAggregatedAt: true },
    });

    return Response.json({
      members: members.map((m: typeof members[0]) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        stats: m.profileStats,
        hasStats: !!m.profileStats,
      })),
      totalDailyActivities,
      lastAggregatedAt: latestStats?.lastAggregatedAt,
    });
  } catch (error) {
    console.error("Error fetching aggregate status:", error);
    return Response.json(
      { error: "상태 조회 중 오류 발생" },
      { status: 500 }
    );
  }
}
