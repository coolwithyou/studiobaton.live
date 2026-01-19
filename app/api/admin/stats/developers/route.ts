import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { formatKST, nowKST, subDaysKST } from "@/lib/date-utils";
import { logError, normalizeError, AuthError, ValidationError } from "@/lib/errors";
import { formatZodError } from "@/lib/validation";
import { normalizeEmailForDisplay, isGitHubNoreplyEmail } from "@/lib/github";
import { z } from "zod";

const developerStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

interface DeveloperStats {
  author: string;
  email: string | null;
  displayEmail: string | null;
  isNoreplyEmail: boolean;
  avatar: string | null;
  summary: {
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
    totalFilesChanged: number;
    avgCommitSize: number;
    activeDays: number;
  };
  dailyActivity: Array<{
    date: string;
    commits: number;
    additions: number;
    deletions: number;
  }>;
  repositories: Array<{
    name: string;
    commits: number;
    percentage: number;
  }>;
  hourlyDistribution: number[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      throw new AuthError();
    }

    const { searchParams } = new URL(request.url);

    // 입력 검증
    let params;
    try {
      params = developerStatsQuerySchema.parse({
        days: searchParams.get("days") || 7,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("파라미터가 올바르지 않습니다.", formatZodError(error));
      }
      throw error;
    }

    const { days } = params;
    const startDate = subDaysKST(nowKST(), days);
    const endDate = nowKST();

    // 기간 내 모든 커밋 조회
    const commits = await prisma.commitLog.findMany({
      where: {
        committedAt: { gte: startDate, lte: endDate },
      },
      select: {
        author: true,
        authorEmail: true,
        authorAvatar: true,
        additions: true,
        deletions: true,
        filesChanged: true,
        repository: true,
        committedAt: true,
      },
      orderBy: { committedAt: "desc" },
    });

    // 개발자별로 그룹화
    const developerMap = new Map<string, {
      email: string | null;
      avatar: string | null;
      commits: typeof commits;
    }>();

    for (const commit of commits) {
      const existing = developerMap.get(commit.author);
      if (existing) {
        existing.commits.push(commit);
        // 최신 이메일/아바타로 업데이트
        if (commit.authorEmail) existing.email = commit.authorEmail;
        if (commit.authorAvatar) existing.avatar = commit.authorAvatar;
      } else {
        developerMap.set(commit.author, {
          email: commit.authorEmail,
          avatar: commit.authorAvatar,
          commits: [commit],
        });
      }
    }

    // 개발자별 통계 계산
    const developers: DeveloperStats[] = [];

    for (const [author, data] of developerMap) {
      const { email, avatar, commits: authorCommits } = data;

      // 요약 통계
      const totalAdditions = authorCommits.reduce((sum, c) => sum + c.additions, 0);
      const totalDeletions = authorCommits.reduce((sum, c) => sum + c.deletions, 0);
      const totalFilesChanged = authorCommits.reduce((sum, c) => sum + c.filesChanged, 0);
      const avgCommitSize = Math.round((totalAdditions + totalDeletions) / authorCommits.length);

      // 활동 일수
      const activeDaysSet = new Set(
        authorCommits.map((c) => formatKST(c.committedAt, "yyyy-MM-dd"))
      );

      // 일별 활동
      const dailyMap = new Map<string, { commits: number; additions: number; deletions: number }>();
      for (let i = days - 1; i >= 0; i--) {
        const date = formatKST(subDaysKST(nowKST(), i), "yyyy-MM-dd");
        dailyMap.set(date, { commits: 0, additions: 0, deletions: 0 });
      }
      for (const commit of authorCommits) {
        const date = formatKST(commit.committedAt, "yyyy-MM-dd");
        const daily = dailyMap.get(date);
        if (daily) {
          daily.commits += 1;
          daily.additions += commit.additions;
          daily.deletions += commit.deletions;
        }
      }
      const dailyActivity = Array.from(dailyMap.entries()).map(([date, stats]) => ({
        date,
        ...stats,
      }));

      // 리포지토리별 커밋 수
      const repoMap = new Map<string, number>();
      for (const commit of authorCommits) {
        repoMap.set(commit.repository, (repoMap.get(commit.repository) || 0) + 1);
      }
      const repositories = Array.from(repoMap.entries())
        .map(([name, commits]) => ({
          name,
          commits,
          percentage: Math.round((commits / authorCommits.length) * 100),
        }))
        .sort((a, b) => b.commits - a.commits);

      // 시간대별 분포 (0-23시)
      const hourlyDistribution = new Array(24).fill(0);
      for (const commit of authorCommits) {
        const hour = parseInt(formatKST(commit.committedAt, "H"), 10);
        hourlyDistribution[hour] += 1;
      }

      developers.push({
        author,
        email,
        displayEmail: normalizeEmailForDisplay(email),
        isNoreplyEmail: isGitHubNoreplyEmail(email),
        avatar,
        summary: {
          totalCommits: authorCommits.length,
          totalAdditions,
          totalDeletions,
          totalFilesChanged,
          avgCommitSize,
          activeDays: activeDaysSet.size,
        },
        dailyActivity,
        repositories,
        hourlyDistribution,
      });
    }

    // 커밋 수 기준 정렬
    developers.sort((a, b) => b.summary.totalCommits - a.summary.totalCommits);

    // 팀 전체 요약
    const teamSummary = {
      totalDevelopers: developers.length,
      totalCommits: commits.length,
      totalAdditions: developers.reduce((sum, d) => sum + d.summary.totalAdditions, 0),
      totalDeletions: developers.reduce((sum, d) => sum + d.summary.totalDeletions, 0),
      avgCommitsPerDev: developers.length > 0
        ? Math.round(commits.length / developers.length)
        : 0,
    };

    return NextResponse.json({
      developers,
      teamSummary,
      period: {
        days,
        startDate: formatKST(startDate, "yyyy-MM-dd"),
        endDate: formatKST(endDate, "yyyy-MM-dd"),
      },
    });
  } catch (error) {
    logError("Fetch developer stats", error);
    const apiError = normalizeError(error);
    return NextResponse.json(apiError.toJSON(), { status: apiError.status });
  }
}
