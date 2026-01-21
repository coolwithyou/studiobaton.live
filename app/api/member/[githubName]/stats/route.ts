/**
 * 멤버 프로필 통계 조회 API
 * GET /api/member/[githubName]/stats
 *
 * 공개 API - 멤버 프로필 페이지에서 사용합니다.
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getMemberProfileStats,
  getHeatmapData,
  getWeeklyTrendData,
  getCommitTypeDistribution,
  getRepoDistribution,
} from "@/lib/profile-stats";
import { getBadgeDetails } from "@/lib/badges";
import { calculateTrophies, TrophyStats } from "@/lib/trophies";

interface RouteParams {
  params: Promise<{
    githubName: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { githubName } = await params;

  try {
    // 멤버 조회
    const member = await prisma.member.findFirst({
      where: {
        githubName,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        githubName: true,
        email: true,
        avatarUrl: true,
        profileImageUrl: true,
      },
    });

    if (!member) {
      return Response.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // URL 쿼리 파라미터로 요청할 데이터 범위 지정
    const searchParams = request.nextUrl.searchParams;
    const includeHeatmap = searchParams.get("heatmap") !== "false";
    const includeTrend = searchParams.get("trend") !== "false";
    const includeTypes = searchParams.get("types") !== "false";
    const includeRepos = searchParams.get("repos") !== "false";

    // 프로필 통계 조회
    const stats = await getMemberProfileStats(member.id);

    if (!stats) {
      return Response.json({
        member: {
          id: member.id,
          name: member.name,
          githubName: member.githubName,
          avatarUrl: member.avatarUrl,
          profileImageUrl: member.profileImageUrl,
        },
        stats: null,
        heatmap: [],
        trend: [],
        commitTypes: null,
        repos: [],
        badges: [],
        trophies: [],
      });
    }

    // 배지 상세 정보
    const badgeIds = (stats.badges as string[]) || [];
    const badges = getBadgeDetails(badgeIds);

    // 추가 데이터 조회 (repos는 트로피 계산에 필요하므로 항상 조회)
    const [heatmap, trend, commitTypes, repos] = await Promise.all([
      includeHeatmap ? getHeatmapData(member.id) : [],
      includeTrend ? getWeeklyTrendData(member.id) : [],
      includeTypes ? getCommitTypeDistribution(member.id) : null,
      getRepoDistribution(member.id), // 트로피 계산에 필요
    ]);

    // 트로피 계산 (repos 데이터 이후에 실행)
    const trophyStats: TrophyStats = {
      totalCommits: stats.totalCommits,
      longestStreak: stats.longestStreak,
      activeDays: stats.activeDays,
      totalAdditions: stats.totalAdditions,
      totalDeletions: stats.totalDeletions,
      repositoryCount: repos.length,
    };
    const trophies = calculateTrophies(trophyStats);

    return Response.json({
      member: {
        id: member.id,
        name: member.name,
        githubName: member.githubName,
        avatarUrl: member.avatarUrl,
        profileImageUrl: member.profileImageUrl,
      },
      stats: {
        totalCommits: stats.totalCommits,
        totalAdditions: stats.totalAdditions,
        totalDeletions: stats.totalDeletions,
        firstCommitAt: stats.firstCommitAt,
        lastCommitAt: stats.lastCommitAt,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        peakHour: stats.peakHour,
        activeDays: stats.activeDays,
        lastAggregatedAt: stats.lastAggregatedAt,
      },
      heatmap,
      trend,
      commitTypes,
      repos: includeRepos ? repos : [],
      badges,
      trophies,
    });
  } catch (error) {
    console.error("Error fetching member stats:", error);
    return Response.json(
      { error: "통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
