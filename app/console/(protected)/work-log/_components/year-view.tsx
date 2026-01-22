"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  format,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
  isSameDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { formatKST } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, TrendingUp, Calendar, GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";

interface DaySummary {
  date: string;
  totalTasks: number;
  completedTasks: number;
  totalCommits: number;
}

interface MonthSummary {
  month: number;
  totalTasks: number;
  completedTasks: number;
  totalCommits: number;
  activeDays: number;
}

interface YearData {
  days: DaySummary[];
  months: MonthSummary[];
  summary: {
    totalTasks: number;
    completedTasks: number;
    totalCommits: number;
    activeDays: number;
    longestStreak: number;
    currentStreak: number;
  };
}

interface YearViewProps {
  memberId: string;
  memberGithubName: string;
  date: Date;
}

export function YearView({ memberId, memberGithubName, date }: YearViewProps) {
  const [data, setData] = useState<YearData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = formatKST(date, "yyyy-MM-dd");

      // 캐시된 통계 API 먼저 시도
      const cacheRes = await fetch(
        `/api/console/worklog-stats?memberId=${memberId}&type=year&date=${dateStr}`
      );

      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();

        // 캐시 데이터가 있으면 사용
        if (cacheData.days && cacheData.days.length > 0) {
          setData({
            days: cacheData.days,
            months: cacheData.months,
            summary: cacheData.summary,
          });
          setLoading(false);
          return;
        }
      }

      // 캐시가 없으면 기존 로직으로 폴백 (초기 데이터 수집용)
      const now = new Date();
      const yearStartDate = startOfYear(date);
      const yearEndDate = endOfYear(date);
      const monthsInYear = eachMonthOfInterval({ start: yearStartDate, end: yearEndDate });

      const allDays: DaySummary[] = [];

      // 12개월을 3개월씩 4번으로 나눠서 요청
      for (let i = 0; i < monthsInYear.length; i += 3) {
        const batchMonths = monthsInYear.slice(i, i + 3);
        const batchPromises = batchMonths.flatMap((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const monthDays = eachDayOfInterval({
            start: monthStart,
            end: monthEnd > now ? now : monthEnd,
          }).filter((d) => d <= now);

          return monthDays.map(async (day) => {
            const dayStr = formatKST(day, "yyyy-MM-dd");

            try {
              const [standupRes, reviewRes] = await Promise.all([
                fetch(`/api/console/standup?date=${dayStr}&memberId=${memberId}`),
                fetch(`/api/console/review?date=${dayStr}&memberId=${memberId}`),
              ]);

              const [standupJson, reviewJson] = await Promise.all([
                standupRes.json(),
                reviewRes.json(),
              ]);

              const tasks = [
                ...(standupJson.standup?.tasks || []),
                ...(standupJson.standup?.carriedOverTasks || []),
              ];

              return {
                date: dayStr,
                totalTasks: tasks.length,
                completedTasks: tasks.filter(
                  (t: { isCompleted: boolean }) => t.isCompleted
                ).length,
                totalCommits: reviewJson.summary?.totalCommits || 0,
              };
            } catch {
              return {
                date: dayStr,
                totalTasks: 0,
                completedTasks: 0,
                totalCommits: 0,
              };
            }
          });
        });

        const batchResults = await Promise.all(batchPromises);
        allDays.push(...batchResults);
      }

      // 월별 요약 계산
      const monthSummaries: MonthSummary[] = monthsInYear.map((month, index) => {
        const monthDays = allDays.filter((d) => {
          const dayDate = new Date(d.date);
          return dayDate.getMonth() === index && dayDate.getFullYear() === date.getFullYear();
        });

        return {
          month: index,
          totalTasks: monthDays.reduce((sum, d) => sum + d.totalTasks, 0),
          completedTasks: monthDays.reduce((sum, d) => sum + d.completedTasks, 0),
          totalCommits: monthDays.reduce((sum, d) => sum + d.totalCommits, 0),
          activeDays: monthDays.filter((d) => d.totalTasks > 0 || d.totalCommits > 0).length,
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

      const sortedDays = [...allDays].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      sortedDays.forEach((day) => {
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

      for (let i = sortedDays.length - 1; i >= 0; i--) {
        const day = sortedDays[i];
        if (day.totalTasks > 0 || day.totalCommits > 0) {
          currentStreak++;
        } else {
          break;
        }
      }

      setData({
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
      });
    } catch (error) {
      console.error("Failed to fetch year data:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, memberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 날짜별 데이터 맵
  const dayDataMap = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.days.map((d) => [d.date, d]));
  }, [data]);

  // GitHub 스타일 히트맵 생성 (미래 일자 포함)
  const generateHeatmapData = useMemo(() => {
    const weeks: { date: Date; data: DaySummary | null; isFuture: boolean; isInYear: boolean }[][] = [];
    const yearStartWeek = startOfWeek(yearStart, { weekStartsOn: 0 });
    const yearEndWeek = endOfWeek(yearEnd, { weekStartsOn: 0 });
    const now = new Date();

    let currentDate = yearStartWeek;
    let currentWeek: { date: Date; data: DaySummary | null; isFuture: boolean; isInYear: boolean }[] = [];

    while (currentDate <= yearEndWeek) {
      const dateStr = formatKST(currentDate, "yyyy-MM-dd");
      const isInYear = currentDate >= yearStart && currentDate <= yearEnd;
      const isFuture = currentDate > now;

      currentWeek.push({
        date: currentDate,
        data: isInYear && !isFuture ? dayDataMap.get(dateStr) || null : null,
        isFuture,
        isInYear,
      });

      if (getDay(currentDate) === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [yearStart, yearEnd, dayDataMap]);

  const getHeatmapLevel = (commits: number): number => {
    if (commits === 0) return 0;
    if (commits <= 2) return 1;
    if (commits <= 5) return 2;
    if (commits <= 10) return 3;
    return 4;
  };

  const heatmapColors = [
    "bg-muted/50",
    "bg-green-200 dark:bg-green-900",
    "bg-green-300 dark:bg-green-700",
    "bg-green-400 dark:bg-green-600",
    "bg-green-500 dark:bg-green-500",
  ];

  const futureColor = "bg-muted/30";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          연간 데이터를 불러오는 중... (시간이 걸릴 수 있습니다)
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  const progressPercentage =
    data.summary.totalTasks > 0
      ? (data.summary.completedTasks / data.summary.totalTasks) * 100
      : 0;

  const hoveredData = hoveredDate ? dayDataMap.get(hoveredDate) : null;

  return (
    <div className="space-y-6">
      {/* 연간 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* 활동 일수 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" />
              활동 일수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{data.summary.activeDays}일</span>
          </CardContent>
        </Card>

        {/* 할 일 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              연간 할 일
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <span className="text-2xl font-bold">{data.summary.completedTasks}</span>
              <p className="text-xs text-muted-foreground">
                / {data.summary.totalTasks} ({Math.round(progressPercentage)}%)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 커밋 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <GitCommit className="size-3" />
              연간 커밋
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{data.summary.totalCommits}</span>
          </CardContent>
        </Card>

        {/* 연속 기록 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="size-3" />
              연속 기록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <span className="text-2xl font-bold">{data.summary.currentStreak}일</span>
              <p className="text-xs text-muted-foreground">
                최고 {data.summary.longestStreak}일
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI 연간 요약 */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3" />
              AI 요약
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-[10px]">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* GitHub 스타일 연간 히트맵 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{format(date, "yyyy년", { locale: ko })} 활동 그래프</span>
            {hoveredData && hoveredDate && (
              <span className="text-sm font-normal text-muted-foreground">
                {format(new Date(hoveredDate), "M월 d일", { locale: ko })}:{" "}
                {hoveredData.totalCommits} 커밋, {hoveredData.completedTasks}/
                {hoveredData.totalTasks} 완료
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 월 레이블 */}
          <div className="flex mb-2 text-xs text-muted-foreground">
            <div className="w-8" />
            {months.map((month, i) => (
              <div
                key={i}
                className="flex-1 text-center"
                style={{ minWidth: `${100 / 12}%` }}
              >
                {format(month, "MMM", { locale: ko })}
              </div>
            ))}
          </div>

          {/* 히트맵 그리드 */}
          <div className="flex gap-0.5 overflow-x-auto pb-2">
            {/* 요일 레이블 */}
            <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground pr-1">
              <div className="h-3" />
              <div className="h-3">월</div>
              <div className="h-3" />
              <div className="h-3">수</div>
              <div className="h-3" />
              <div className="h-3">금</div>
              <div className="h-3" />
            </div>

            {/* 주별 컬럼 */}
            {generateHeatmapData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) => {
                  const dateStr = formatKST(day.date, "yyyy-MM-dd");
                  const level = day.data ? getHeatmapLevel(day.data.totalCommits) : 0;
                  const isToday = isSameDay(day.date, new Date());
                  const canHover = day.isInYear && !day.isFuture;

                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "size-[11px] rounded-[2px] transition-all",
                        !day.isInYear && "bg-transparent",
                        day.isInYear && day.isFuture && futureColor,
                        day.isInYear && !day.isFuture && heatmapColors[level],
                        canHover && "hover:ring-1 hover:ring-primary cursor-pointer",
                        isToday && "ring-1 ring-primary"
                      )}
                      onMouseEnter={() => canHover && setHoveredDate(dateStr)}
                      onMouseLeave={() => setHoveredDate(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* 범례 */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
            <span>적음</span>
            <div className="flex gap-[3px]">
              {heatmapColors.map((color, i) => (
                <div key={i} className={cn("size-[11px] rounded-[2px]", color)} />
              ))}
            </div>
            <span>많음</span>
          </div>
        </CardContent>
      </Card>

      {/* 월별 요약 그리드 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">월별 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.months.map((month) => {
              const monthDate = new Date(date.getFullYear(), month.month, 1);
              const isFuture = monthDate > new Date();
              const completionRate =
                month.totalTasks > 0
                  ? Math.round((month.completedTasks / month.totalTasks) * 100)
                  : 0;

              return (
                <div
                  key={month.month}
                  className={cn(
                    "p-3 rounded-lg border",
                    isFuture && "opacity-40"
                  )}
                >
                  <p className="text-sm font-medium mb-2">
                    {format(monthDate, "M월", { locale: ko })}
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">활동</span>
                      <span>{month.activeDays}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">할 일</span>
                      <span>
                        {month.completedTasks}/{month.totalTasks}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">커밋</span>
                      <span>{month.totalCommits}</span>
                    </div>
                    <Progress value={completionRate} className="h-1 mt-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
