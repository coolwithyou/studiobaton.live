/**
 * 프로필 통계 집계 및 스트릭 계산 로직
 */

import prisma from "@/lib/prisma";
import {
  formatKST,
  startOfDayKST,
  subDaysKST,
  toKST,
  nowKST,
} from "@/lib/date-utils";
import { calculateBadges, BadgeCheckStats } from "@/lib/badges";
import { isSameDay, differenceInDays } from "date-fns";

/**
 * 커밋 메시지에서 유형을 파싱합니다.
 * @returns "feat" | "fix" | "refactor" | "other"
 */
export function parseCommitType(
  message: string
): "feat" | "fix" | "refactor" | "other" {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.startsWith("feat:") ||
    lowerMessage.startsWith("feat(") ||
    lowerMessage.includes("[feat]")
  ) {
    return "feat";
  }

  if (
    lowerMessage.startsWith("fix:") ||
    lowerMessage.startsWith("fix(") ||
    lowerMessage.includes("[fix]") ||
    lowerMessage.startsWith("bugfix:")
  ) {
    return "fix";
  }

  if (
    lowerMessage.startsWith("refactor:") ||
    lowerMessage.startsWith("refactor(") ||
    lowerMessage.includes("[refactor]")
  ) {
    return "refactor";
  }

  return "other";
}

/**
 * 특정 멤버의 특정 날짜에 대한 일일 활동을 집계합니다.
 */
export async function aggregateDailyActivity(
  memberId: string,
  memberEmail: string,
  date: Date
): Promise<void> {
  const { start, end } = {
    start: startOfDayKST(date),
    end: new Date(startOfDayKST(date).getTime() + 24 * 60 * 60 * 1000 - 1),
  };

  // 해당 날짜의 커밋 조회
  const commits = await prisma.commitLog.findMany({
    where: {
      authorEmail: memberEmail,
      committedAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      sha: true,
      repository: true,
      message: true,
      additions: true,
      deletions: true,
      filesChanged: true,
      committedAt: true,
    },
  });

  if (commits.length === 0) {
    // 커밋이 없으면 해당 날짜의 레코드 삭제 (있다면)
    await prisma.memberDailyActivity.deleteMany({
      where: {
        memberId,
        date: startOfDayKST(date),
      },
    });
    return;
  }

  // 집계 계산
  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;
  let featCount = 0;
  let fixCount = 0;
  let refactorCount = 0;
  let otherCount = 0;

  const repoBreakdown: Record<string, number> = {};
  const hourlyDistribution = new Array(24).fill(0);

  for (const commit of commits) {
    additions += commit.additions;
    deletions += commit.deletions;
    filesChanged += commit.filesChanged;

    // 레포별 집계
    repoBreakdown[commit.repository] =
      (repoBreakdown[commit.repository] || 0) + 1;

    // 시간대별 집계 (KST 기준)
    const hour = parseInt(formatKST(commit.committedAt, "H"), 10);
    hourlyDistribution[hour] += 1;

    // 커밋 유형별 집계
    const commitType = parseCommitType(commit.message);
    switch (commitType) {
      case "feat":
        featCount++;
        break;
      case "fix":
        fixCount++;
        break;
      case "refactor":
        refactorCount++;
        break;
      default:
        otherCount++;
    }
  }

  // upsert로 저장
  await prisma.memberDailyActivity.upsert({
    where: {
      memberId_date: {
        memberId,
        date: startOfDayKST(date),
      },
    },
    create: {
      memberId,
      date: startOfDayKST(date),
      commitCount: commits.length,
      additions,
      deletions,
      filesChanged,
      repoBreakdown,
      hourlyDistribution,
      featCount,
      fixCount,
      refactorCount,
      otherCount,
    },
    update: {
      commitCount: commits.length,
      additions,
      deletions,
      filesChanged,
      repoBreakdown,
      hourlyDistribution,
      featCount,
      fixCount,
      refactorCount,
      otherCount,
    },
  });
}

/**
 * 스트릭 계산 (연속 커밋 일수)
 */
export function calculateStreak(
  dailyActivities: Array<{ date: Date; commitCount: number }>,
  today: Date
): { current: number; longest: number } {
  // 커밋이 있는 날짜만 필터링하고 날짜순 정렬 (최신순)
  const activeDates = dailyActivities
    .filter((a) => a.commitCount > 0)
    .map((a) => startOfDayKST(a.date))
    .sort((a, b) => b.getTime() - a.getTime());

  if (activeDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  const todayStart = startOfDayKST(today);
  const yesterdayStart = startOfDayKST(subDaysKST(today, 1));

  // 현재 스트릭 계산
  let current = 0;
  let checkDate = todayStart;

  // 오늘 또는 어제부터 시작
  const firstActiveDate = activeDates[0];
  const isActiveToday = isSameDay(firstActiveDate, todayStart);
  const isActiveYesterday = isSameDay(firstActiveDate, yesterdayStart);

  if (isActiveToday || isActiveYesterday) {
    checkDate = isActiveToday ? todayStart : yesterdayStart;

    for (const activeDate of activeDates) {
      if (isSameDay(activeDate, checkDate)) {
        current++;
        checkDate = startOfDayKST(subDaysKST(checkDate, 1));
      } else if (activeDate.getTime() < checkDate.getTime()) {
        // 연속이 끊김
        break;
      }
    }
  }

  // 최장 스트릭 계산
  let longest = 0;
  let currentLongest = 0;
  let prevDate: Date | null = null;

  // 날짜순 정렬 (오래된 순)
  const sortedAsc = [...activeDates].sort(
    (a, b) => a.getTime() - b.getTime()
  );

  for (const activeDate of sortedAsc) {
    if (prevDate === null) {
      currentLongest = 1;
    } else {
      const diff = differenceInDays(activeDate, prevDate);
      if (diff === 1) {
        currentLongest++;
      } else {
        longest = Math.max(longest, currentLongest);
        currentLongest = 1;
      }
    }
    prevDate = activeDate;
  }
  longest = Math.max(longest, currentLongest);

  return { current, longest };
}

/**
 * 멤버의 프로필 통계를 업데이트합니다.
 */
export async function updateMemberProfileStats(
  memberId: string
): Promise<void> {
  // 모든 일일 활동 조회
  const dailyActivities = await prisma.memberDailyActivity.findMany({
    where: { memberId },
    select: {
      date: true,
      commitCount: true,
      additions: true,
      deletions: true,
      hourlyDistribution: true,
      featCount: true,
      fixCount: true,
      refactorCount: true,
      otherCount: true,
    },
    orderBy: { date: "asc" },
  });

  if (dailyActivities.length === 0) {
    return;
  }

  // 전체 통계 집계
  let totalCommits = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;
  let totalFeatCount = 0;
  let totalFixCount = 0;
  let totalRefactorCount = 0;

  const totalHourlyDistribution = new Array(24).fill(0);

  for (const activity of dailyActivities) {
    totalCommits += activity.commitCount;
    totalAdditions += activity.additions;
    totalDeletions += activity.deletions;
    totalFeatCount += activity.featCount;
    totalFixCount += activity.fixCount;
    totalRefactorCount += activity.refactorCount;

    // 시간대별 합산
    if (Array.isArray(activity.hourlyDistribution)) {
      for (let i = 0; i < 24; i++) {
        totalHourlyDistribution[i] += activity.hourlyDistribution[i] || 0;
      }
    }
  }

  // 피크 시간 계산
  let peakHour: number | null = null;
  let maxHourlyCount = 0;
  for (let i = 0; i < 24; i++) {
    if (totalHourlyDistribution[i] > maxHourlyCount) {
      maxHourlyCount = totalHourlyDistribution[i];
      peakHour = i;
    }
  }

  // 스트릭 계산
  const { current: currentStreak, longest: longestStreak } = calculateStreak(
    dailyActivities,
    nowKST()
  );

  // 첫 커밋, 마지막 커밋 날짜
  const firstCommitAt = dailyActivities[0]?.date;
  const lastCommitAt = dailyActivities[dailyActivities.length - 1]?.date;

  // 활동 일수
  const activeDays = dailyActivities.filter((a) => a.commitCount > 0).length;

  // 배지 계산
  const badgeStats: BadgeCheckStats = {
    totalCommits,
    totalAdditions,
    totalDeletions,
    currentStreak,
    longestStreak,
    peakHour,
    activeDays,
    featCount: totalFeatCount,
    fixCount: totalFixCount,
    refactorCount: totalRefactorCount,
  };
  const badges = calculateBadges(badgeStats);

  // 프로필 통계 upsert
  await prisma.memberProfileStats.upsert({
    where: { memberId },
    create: {
      memberId,
      totalCommits,
      totalAdditions,
      totalDeletions,
      firstCommitAt,
      lastCommitAt,
      currentStreak,
      longestStreak,
      peakHour,
      activeDays,
      badges,
      lastAggregatedAt: new Date(),
    },
    update: {
      totalCommits,
      totalAdditions,
      totalDeletions,
      firstCommitAt,
      lastCommitAt,
      currentStreak,
      longestStreak,
      peakHour,
      activeDays,
      badges,
      lastAggregatedAt: new Date(),
    },
  });
}

/**
 * 모든 활성 멤버의 특정 날짜 활동을 집계합니다.
 */
export async function aggregateAllMembersForDate(date: Date): Promise<{
  processed: number;
  skipped: number;
}> {
  const members = await prisma.member.findMany({
    where: { isActive: true },
    select: { id: true, email: true },
  });

  let processed = 0;
  let skipped = 0;

  for (const member of members) {
    try {
      await aggregateDailyActivity(member.id, member.email, date);
      await updateMemberProfileStats(member.id);
      processed++;
    } catch (error) {
      console.error(
        `Failed to aggregate for member ${member.id}:`,
        error
      );
      skipped++;
    }
  }

  return { processed, skipped };
}

/**
 * 특정 멤버의 전체 기간 데이터를 재집계합니다.
 * (초기 수집 후 또는 수동 재집계 시 사용)
 */
export async function rebuildMemberStats(
  memberId: string,
  memberEmail: string
): Promise<void> {
  // 해당 멤버의 모든 커밋 날짜 조회
  const commits = await prisma.commitLog.findMany({
    where: { authorEmail: memberEmail },
    select: { committedAt: true },
    orderBy: { committedAt: "asc" },
  });

  if (commits.length === 0) {
    return;
  }

  // 고유 날짜 목록 추출
  const uniqueDates = new Set<string>();
  for (const commit of commits) {
    const dateStr = formatKST(commit.committedAt, "yyyy-MM-dd");
    uniqueDates.add(dateStr);
  }

  // 각 날짜별로 일일 활동 집계
  for (const dateStr of uniqueDates) {
    const date = new Date(dateStr);
    await aggregateDailyActivity(memberId, memberEmail, date);
  }

  // 프로필 통계 업데이트
  await updateMemberProfileStats(memberId);
}

/**
 * 프로필 통계를 조회합니다.
 */
export async function getMemberProfileStats(memberId: string) {
  const stats = await prisma.memberProfileStats.findUnique({
    where: { memberId },
  });

  return stats;
}

/**
 * 히트맵 데이터를 조회합니다 (해당 연도 기준)
 * @param memberId 멤버 ID
 * @param year 조회할 연도 (기본: 현재 연도)
 */
export async function getHeatmapData(
  memberId: string,
  year?: number
): Promise<Array<{ date: string; count: number }>> {
  const targetYear = year ?? nowKST().getFullYear();
  const startDate = startOfDayKST(new Date(targetYear, 0, 1)); // 연도 1월 1일
  const endDate = startOfDayKST(new Date(targetYear, 11, 31, 23, 59, 59)); // 연도 12월 31일

  const activities = await prisma.memberDailyActivity.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      date: true,
      commitCount: true,
    },
    orderBy: { date: "asc" },
  });

  return activities.map((a) => ({
    date: formatKST(a.date, "yyyy-MM-dd"),
    count: a.commitCount,
  }));
}

/**
 * 주간 트렌드 데이터를 조회합니다 (해당 연도 기준).
 * @param memberId 멤버 ID
 * @param year 조회할 연도 (기본: 현재 연도)
 */
export async function getWeeklyTrendData(
  memberId: string,
  year?: number
): Promise<Array<{ week: string; commits: number; additions: number; deletions: number }>> {
  const targetYear = year ?? nowKST().getFullYear();
  const startDate = startOfDayKST(new Date(targetYear, 0, 1)); // 연도 1월 1일
  const endDate = startOfDayKST(new Date(targetYear, 11, 31, 23, 59, 59)); // 연도 12월 31일

  const activities = await prisma.memberDailyActivity.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      date: true,
      commitCount: true,
      additions: true,
      deletions: true,
    },
    orderBy: { date: "asc" },
  });

  // 주 단위로 그룹화
  const weeklyData: Record<
    string,
    { commits: number; additions: number; deletions: number }
  > = {};

  for (const activity of activities) {
    const weekKey = formatKST(activity.date, "yyyy-'W'ww");
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { commits: 0, additions: 0, deletions: 0 };
    }
    weeklyData[weekKey].commits += activity.commitCount;
    weeklyData[weekKey].additions += activity.additions;
    weeklyData[weekKey].deletions += activity.deletions;
  }

  return Object.entries(weeklyData).map(([week, data]) => ({
    week,
    ...data,
  }));
}

/**
 * 커밋 유형별 분포를 조회합니다.
 */
export async function getCommitTypeDistribution(
  memberId: string
): Promise<{
  feat: number;
  fix: number;
  refactor: number;
  other: number;
  total: number;
}> {
  const activities = await prisma.memberDailyActivity.findMany({
    where: { memberId },
    select: {
      featCount: true,
      fixCount: true,
      refactorCount: true,
      otherCount: true,
    },
  });

  let feat = 0;
  let fix = 0;
  let refactor = 0;
  let other = 0;

  for (const activity of activities) {
    feat += activity.featCount;
    fix += activity.fixCount;
    refactor += activity.refactorCount;
    other += activity.otherCount;
  }

  return {
    feat,
    fix,
    refactor,
    other,
    total: feat + fix + refactor + other,
  };
}

/**
 * 프로젝트별 기여 분포를 조회합니다.
 */
export async function getRepoDistribution(
  memberId: string
): Promise<Array<{ repo: string; commits: number; percentage: number }>> {
  const activities = await prisma.memberDailyActivity.findMany({
    where: { memberId },
    select: { repoBreakdown: true },
  });

  const repoTotals: Record<string, number> = {};
  let totalCommits = 0;

  for (const activity of activities) {
    if (activity.repoBreakdown && typeof activity.repoBreakdown === "object") {
      const breakdown = activity.repoBreakdown as Record<string, number>;
      for (const [repo, count] of Object.entries(breakdown)) {
        repoTotals[repo] = (repoTotals[repo] || 0) + count;
        totalCommits += count;
      }
    }
  }

  return Object.entries(repoTotals)
    .map(([repo, commits]) => ({
      repo,
      commits,
      percentage: totalCommits > 0 ? (commits / totalCommits) * 100 : 0,
    }))
    .sort((a, b) => b.commits - a.commits);
}
