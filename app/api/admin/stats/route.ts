import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { statsQuerySchema, formatZodError } from "@/lib/validation";
import { logError, normalizeError, AuthError, ValidationError } from "@/lib/errors";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionData();

    if (!session.isLoggedIn) {
      throw new AuthError();
    }

    const { searchParams } = new URL(request.url);

    // 입력 검증
    let params;
    try {
      params = statsQuerySchema.parse({
        startDate: searchParams.get("startDate") || format(subDays(new Date(), 30), "yyyy-MM-dd"),
        endDate: searchParams.get("endDate") || format(new Date(), "yyyy-MM-dd"),
        groupBy: searchParams.get("groupBy") || "day",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("파라미터가 올바르지 않습니다.", formatZodError(error));
      }
      throw error;
    }

    const { startDate, endDate, groupBy } = params;

    // 기본 통계 조회
    const [
      totalCommits,
      totalPosts,
      publishedPosts,
      draftPosts,
      uniqueAuthors,
      repoStats,
      recentActivity,
    ] = await Promise.all([
      // 전체 커밋 수
      prisma.commitLog.count({
        where: {
          committedAt: { gte: startDate, lte: endDate },
        },
      }),

      // 전체 포스트 수
      prisma.post.count({
        where: {
          targetDate: { gte: startDate, lte: endDate },
        },
      }),

      // 발행된 포스트 수
      prisma.post.count({
        where: {
          targetDate: { gte: startDate, lte: endDate },
          status: "PUBLISHED",
        },
      }),

      // 드래프트 포스트 수
      prisma.post.count({
        where: {
          targetDate: { gte: startDate, lte: endDate },
          status: "DRAFT",
        },
      }),

      // 고유 저자 수
      prisma.commitLog.findMany({
        where: {
          committedAt: { gte: startDate, lte: endDate },
        },
        distinct: ["author"],
        select: { author: true },
      }),

      // 리포지토리별 통계
      prisma.commitLog.groupBy({
        by: ["repository"],
        where: {
          committedAt: { gte: startDate, lte: endDate },
        },
        _count: { id: true },
        _sum: { additions: true, deletions: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // 최근 7일 활동 (일별)
      prisma.commitLog.groupBy({
        by: ["committedAt"],
        where: {
          committedAt: { gte: subDays(new Date(), 7) },
        },
        _count: { id: true },
      }),
    ]);

    // 일별 활동 데이터 정리
    const activityByDay = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      activityByDay.set(date, 0);
    }
    for (const activity of recentActivity) {
      const dateKey = format(new Date(activity.committedAt), "yyyy-MM-dd");
      if (activityByDay.has(dateKey)) {
        activityByDay.set(dateKey, (activityByDay.get(dateKey) || 0) + activity._count.id);
      }
    }

    // 트렌드 데이터 구성
    const trendData = Array.from(activityByDay.entries()).map(([date, count]) => ({
      date,
      label: format(new Date(date), "EEE", { locale: ko }),
      commits: count,
    }));

    // 리포지토리 통계 정리
    const repositoryData = repoStats.map((repo) => ({
      name: repo.repository,
      commits: repo._count.id,
      additions: repo._sum.additions || 0,
      deletions: repo._sum.deletions || 0,
    }));

    // 총 코드 변경량
    const totalChanges = repositoryData.reduce(
      (acc, repo) => ({
        additions: acc.additions + repo.additions,
        deletions: acc.deletions + repo.deletions,
      }),
      { additions: 0, deletions: 0 }
    );

    return NextResponse.json({
      summary: {
        totalCommits,
        totalPosts,
        publishedPosts,
        draftPosts,
        uniqueAuthors: uniqueAuthors.length,
        totalAdditions: totalChanges.additions,
        totalDeletions: totalChanges.deletions,
      },
      trend: trendData,
      repositories: repositoryData,
      period: {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        groupBy,
      },
    });
  } catch (error) {
    logError("Fetch stats", error);
    const apiError = normalizeError(error);
    return NextResponse.json(apiError.toJSON(), { status: apiError.status });
  }
}
