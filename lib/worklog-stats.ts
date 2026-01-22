/**
 * 업무일지 통계 집계 유틸리티
 * WorkLogDailyStats 테이블을 업데이트하여 뷰 성능을 최적화합니다.
 */

import prisma from "@/lib/prisma";
import { startOfDayKST, formatKST } from "@/lib/date-utils";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subDays,
  startOfYear,
  endOfYear,
} from "date-fns";

interface DailyStats {
  totalTasks: number;
  completedTasks: number;
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * 특정 멤버의 특정 날짜 통계를 계산합니다.
 */
async function calculateDailyStats(
  memberId: string,
  memberGithubName: string,
  memberEmail: string,
  date: Date
): Promise<DailyStats> {
  const dateStr = formatKST(date, "yyyy-MM-dd");
  const startDate = new Date(`${dateStr}T00:00:00+09:00`);
  const endDate = new Date(`${dateStr}T23:59:59.999+09:00`);

  // 할 일 조회
  const standup = await prisma.standup.findUnique({
    where: {
      memberId_date: {
        memberId,
        date: startDate,
      },
    },
    include: {
      tasks: true,
    },
  });

  // 캐리오버된 태스크 조회
  const carriedOverTasks = await prisma.standupTask.findMany({
    where: {
      standup: { memberId },
      dueDate: startDate,
      originalDueDate: { not: startDate },
    },
  });

  const allTasks = [...(standup?.tasks || []), ...carriedOverTasks];
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.isCompleted).length;

  // 커밋 조회
  const commits = await prisma.commitLog.findMany({
    where: {
      authorEmail: memberEmail,
      committedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      additions: true,
      deletions: true,
    },
  });

  const totalCommits = commits.length;
  const totalAdditions = commits.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = commits.reduce((sum, c) => sum + c.deletions, 0);

  return {
    totalTasks,
    completedTasks,
    totalCommits,
    totalAdditions,
    totalDeletions,
  };
}

/**
 * 특정 멤버의 특정 날짜 통계를 업데이트합니다.
 */
async function upsertDailyStats(
  memberId: string,
  memberGithubName: string,
  memberEmail: string,
  date: Date
): Promise<void> {
  const stats = await calculateDailyStats(
    memberId,
    memberGithubName,
    memberEmail,
    date
  );

  const dateOnly = new Date(formatKST(date, "yyyy-MM-dd") + "T00:00:00Z");

  await prisma.workLogDailyStats.upsert({
    where: {
      memberId_date: {
        memberId,
        date: dateOnly,
      },
    },
    update: {
      ...stats,
      aggregatedAt: new Date(),
    },
    create: {
      memberId,
      date: dateOnly,
      ...stats,
    },
  });
}

/**
 * 모든 활성 멤버의 특정 날짜 통계를 집계합니다.
 */
export async function aggregateAllMembersForDate(
  date: Date
): Promise<{ processed: number; skipped: number }> {
  const members = await prisma.member.findMany({
    where: { isActive: true },
    select: {
      id: true,
      githubName: true,
      email: true,
    },
  });

  let processed = 0;
  let skipped = 0;

  for (const member of members) {
    try {
      await upsertDailyStats(member.id, member.githubName, member.email, date);
      processed++;
    } catch (error) {
      console.error(
        `Failed to aggregate stats for member ${member.githubName}:`,
        error
      );
      skipped++;
    }
  }

  return { processed, skipped };
}

/**
 * 모든 활성 멤버의 최근 N일 통계를 집계합니다.
 */
export async function aggregateRecentDays(
  days: number
): Promise<{ totalProcessed: number; totalSkipped: number }> {
  let totalProcessed = 0;
  let totalSkipped = 0;

  for (let i = 0; i < days; i++) {
    const date = startOfDayKST(subDays(new Date(), i));
    const { processed, skipped } = await aggregateAllMembersForDate(date);
    totalProcessed += processed;
    totalSkipped += skipped;
  }

  return { totalProcessed, totalSkipped };
}

/**
 * 특정 기간의 캐시된 통계를 조회합니다.
 */
export async function getCachedStats(
  memberId: string,
  startDate: Date,
  endDate: Date
): Promise<
  {
    date: string;
    totalTasks: number;
    completedTasks: number;
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
  }[]
> {
  const stats = await prisma.workLogDailyStats.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  return stats.map((s) => ({
    date: formatKST(s.date, "yyyy-MM-dd"),
    totalTasks: s.totalTasks,
    completedTasks: s.completedTasks,
    totalCommits: s.totalCommits,
    totalAdditions: s.totalAdditions,
    totalDeletions: s.totalDeletions,
  }));
}

/**
 * 연간 통계 조회 (캐시 사용)
 */
export async function getYearStats(memberId: string, year: number) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const now = new Date();
  const actualEnd = yearEnd > now ? now : yearEnd;

  const stats = await getCachedStats(memberId, yearStart, actualEnd);

  // 날짜별 맵 생성
  const statsMap = new Map(stats.map((s) => [s.date, s]));

  // 모든 날짜에 대해 데이터 생성 (없으면 0으로)
  const days = eachDayOfInterval({ start: yearStart, end: actualEnd });
  const allDays = days.map((day) => {
    const dateStr = formatKST(day, "yyyy-MM-dd");
    return (
      statsMap.get(dateStr) || {
        date: dateStr,
        totalTasks: 0,
        completedTasks: 0,
        totalCommits: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      }
    );
  });

  // 월별 요약
  const monthSummaries = Array.from({ length: 12 }, (_, month) => {
    const monthDays = allDays.filter((d) => {
      const dayDate = new Date(d.date);
      return dayDate.getMonth() === month;
    });

    return {
      month,
      totalTasks: monthDays.reduce((sum, d) => sum + d.totalTasks, 0),
      completedTasks: monthDays.reduce((sum, d) => sum + d.completedTasks, 0),
      totalCommits: monthDays.reduce((sum, d) => sum + d.totalCommits, 0),
      activeDays: monthDays.filter((d) => d.totalTasks > 0 || d.totalCommits > 0)
        .length,
    };
  });

  // 연간 요약 및 스트릭 계산
  let totalTasks = 0;
  let completedTasks = 0;
  let totalCommits = 0;
  let activeDays = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  allDays.forEach((day) => {
    totalTasks += day.totalTasks;
    completedTasks += day.completedTasks;
    totalCommits += day.totalCommits;

    const isActive = day.totalTasks > 0 || day.totalCommits > 0;
    if (isActive) {
      activeDays++;
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  });

  // 현재 스트릭 계산
  for (let i = allDays.length - 1; i >= 0; i--) {
    const day = allDays[i];
    if (day.totalTasks > 0 || day.totalCommits > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    days: allDays,
    months: monthSummaries,
    summary: {
      totalTasks,
      completedTasks,
      totalCommits,
      activeDays,
      longestStreak,
      currentStreak,
    },
  };
}

/**
 * 월간 통계 조회 (캐시 사용)
 */
export async function getMonthStats(memberId: string, date: Date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const now = new Date();
  const actualEnd = monthEnd > now ? now : monthEnd;

  const stats = await getCachedStats(memberId, monthStart, actualEnd);

  // 날짜별 맵 생성
  const statsMap = new Map(stats.map((s) => [s.date, s]));

  // 모든 날짜에 대해 데이터 생성
  const days = eachDayOfInterval({ start: monthStart, end: actualEnd });
  const allDays = days.map((day) => {
    const dateStr = formatKST(day, "yyyy-MM-dd");
    return (
      statsMap.get(dateStr) || {
        date: dateStr,
        totalTasks: 0,
        completedTasks: 0,
        totalCommits: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      }
    );
  });

  return allDays;
}
