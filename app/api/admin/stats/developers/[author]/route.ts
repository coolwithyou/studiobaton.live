import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { formatKST, nowKST, subDaysKST } from "@/lib/date-utils";
import { logError, normalizeError, AuthError, ValidationError, NotFoundError } from "@/lib/errors";
import { formatZodError } from "@/lib/validation";
import { z } from "zod";

const developerDetailQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

interface CommitDetail {
  sha: string;
  message: string;
  repository: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  committedAt: string;
  url: string;
}

interface DayOfWeekStats {
  day: string;
  commits: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ author: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      throw new AuthError();
    }

    const { author: encodedAuthor } = await params;
    const author = decodeURIComponent(encodedAuthor);

    const { searchParams } = new URL(request.url);

    // 입력 검증
    let queryParams;
    try {
      queryParams = developerDetailQuerySchema.parse({
        days: searchParams.get("days") || 7,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("파라미터가 올바르지 않습니다.", formatZodError(error));
      }
      throw error;
    }

    const { days } = queryParams;
    const startDate = subDaysKST(nowKST(), days);
    const endDate = nowKST();

    // 해당 개발자의 커밋 조회
    const commits = await prisma.commitLog.findMany({
      where: {
        author,
        committedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { committedAt: "desc" },
    });

    if (commits.length === 0) {
      throw new NotFoundError(`개발자 "${author}"의 커밋을 찾을 수 없습니다.`);
    }

    // 기본 정보
    const latestCommit = commits[0];
    const developerInfo = {
      author,
      email: latestCommit.authorEmail,
      avatar: latestCommit.authorAvatar,
    };

    // 요약 통계
    const totalAdditions = commits.reduce((sum, c) => sum + c.additions, 0);
    const totalDeletions = commits.reduce((sum, c) => sum + c.deletions, 0);
    const totalFilesChanged = commits.reduce((sum, c) => sum + c.filesChanged, 0);
    const avgCommitSize = Math.round((totalAdditions + totalDeletions) / commits.length);
    const activeDaysSet = new Set(commits.map((c) => formatKST(c.committedAt, "yyyy-MM-dd")));

    const summary = {
      totalCommits: commits.length,
      totalAdditions,
      totalDeletions,
      totalFilesChanged,
      avgCommitSize,
      activeDays: activeDaysSet.size,
      avgCommitsPerDay: Math.round((commits.length / days) * 10) / 10,
    };

    // 일별 활동
    const dailyMap = new Map<string, { commits: number; additions: number; deletions: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const date = formatKST(subDaysKST(nowKST(), i), "yyyy-MM-dd");
      dailyMap.set(date, { commits: 0, additions: 0, deletions: 0 });
    }
    for (const commit of commits) {
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
      label: formatKST(date, "EEE"),
      ...stats,
    }));

    // 시간대별 분포 (0-23시)
    const hourlyDistribution = new Array(24).fill(0);
    for (const commit of commits) {
      const hour = parseInt(formatKST(commit.committedAt, "H"), 10);
      hourlyDistribution[hour] += 1;
    }

    // 요일별 분포
    const dayOfWeekLabels = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeekMap = new Map<number, number>();
    for (let i = 0; i < 7; i++) {
      dayOfWeekMap.set(i, 0);
    }
    for (const commit of commits) {
      const dayOfWeek = new Date(commit.committedAt).getDay();
      dayOfWeekMap.set(dayOfWeek, (dayOfWeekMap.get(dayOfWeek) || 0) + 1);
    }
    const dayOfWeekStats: DayOfWeekStats[] = Array.from(dayOfWeekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, count]) => ({
        day: dayOfWeekLabels[day],
        commits: count,
      }));

    // 리포지토리별 통계
    const repoMap = new Map<string, { commits: number; additions: number; deletions: number }>();
    for (const commit of commits) {
      const existing = repoMap.get(commit.repository);
      if (existing) {
        existing.commits += 1;
        existing.additions += commit.additions;
        existing.deletions += commit.deletions;
      } else {
        repoMap.set(commit.repository, {
          commits: 1,
          additions: commit.additions,
          deletions: commit.deletions,
        });
      }
    }
    const repositories = Array.from(repoMap.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        percentage: Math.round((stats.commits / commits.length) * 100),
      }))
      .sort((a, b) => b.commits - a.commits);

    // 커밋 크기 분포 (작음: <50, 중간: 50-200, 큼: 200-500, 매우 큼: >500)
    const commitSizeDistribution = {
      small: 0,  // <50 lines
      medium: 0, // 50-200 lines
      large: 0,  // 200-500 lines
      xlarge: 0, // >500 lines
    };
    for (const commit of commits) {
      const size = commit.additions + commit.deletions;
      if (size < 50) commitSizeDistribution.small += 1;
      else if (size < 200) commitSizeDistribution.medium += 1;
      else if (size < 500) commitSizeDistribution.large += 1;
      else commitSizeDistribution.xlarge += 1;
    }

    // 최근 커밋 목록 (최대 20개)
    const recentCommits: CommitDetail[] = commits.slice(0, 20).map((c) => ({
      sha: c.sha.substring(0, 7),
      message: c.message.split("\n")[0].substring(0, 80),
      repository: c.repository,
      additions: c.additions,
      deletions: c.deletions,
      filesChanged: c.filesChanged,
      committedAt: formatKST(c.committedAt, "yyyy-MM-dd HH:mm"),
      url: c.url,
    }));

    // 생산성 지표 (참고용)
    const productivityMetrics = {
      // 평균 커밋 크기 (85줄 미만이 Elite 기준)
      avgCommitSizeRating: avgCommitSize < 85 ? "excellent" : avgCommitSize < 200 ? "good" : "large",
      // 활동 일수 비율
      activityRate: Math.round((activeDaysSet.size / days) * 100),
      // 피크 시간대
      peakHour: hourlyDistribution.indexOf(Math.max(...hourlyDistribution)),
      // 주말 vs 평일 비율
      weekdayCommits: dayOfWeekStats.slice(1, 6).reduce((sum, d) => sum + d.commits, 0),
      weekendCommits: dayOfWeekStats[0].commits + dayOfWeekStats[6].commits,
    };

    return NextResponse.json({
      developer: developerInfo,
      summary,
      dailyActivity,
      hourlyDistribution,
      dayOfWeekStats,
      repositories,
      commitSizeDistribution,
      recentCommits,
      productivityMetrics,
      period: {
        days,
        startDate: formatKST(startDate, "yyyy-MM-dd"),
        endDate: formatKST(endDate, "yyyy-MM-dd"),
      },
    });
  } catch (error) {
    logError("Fetch developer detail stats", error);
    const apiError = normalizeError(error);
    return NextResponse.json(apiError.toJSON(), { status: apiError.status });
  }
}
