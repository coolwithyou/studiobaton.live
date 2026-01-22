"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  getDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import { formatKST } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  GitCommit,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DaySummary {
  date: string;
  totalTasks: number;
  completedTasks: number;
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
}

interface MonthData {
  days: DaySummary[];
  summary: {
    totalTasks: number;
    completedTasks: number;
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
    activeDays: number;
  };
}

interface MonthViewProps {
  memberId: string;
  memberGithubName: string;
  date: Date;
}

export function MonthView({ memberId, memberGithubName, date }: MonthViewProps) {
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();

      // 각 날짜별 요약 데이터 병렬 요청
      const dayPromises = monthDays.map(async (day) => {
        const dateStr = formatKST(day, "yyyy-MM-dd");

        // 미래 날짜는 스킵
        if (day > now) {
          return {
            date: dateStr,
            totalTasks: 0,
            completedTasks: 0,
            totalCommits: 0,
            totalAdditions: 0,
            totalDeletions: 0,
          };
        }

        const [standupRes, reviewRes] = await Promise.all([
          fetch(`/api/console/standup?date=${dateStr}&memberId=${memberId}`),
          fetch(`/api/console/review?date=${dateStr}&memberId=${memberId}`),
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
          date: dateStr,
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t: { isCompleted: boolean }) => t.isCompleted).length,
          totalCommits: reviewJson.summary?.totalCommits || 0,
          totalAdditions: reviewJson.summary?.totalAdditions || 0,
          totalDeletions: reviewJson.summary?.totalDeletions || 0,
        };
      });

      const days = await Promise.all(dayPromises);

      // 월간 요약 계산
      let totalTasks = 0;
      let completedTasks = 0;
      let totalCommits = 0;
      let totalAdditions = 0;
      let totalDeletions = 0;
      let activeDays = 0;

      days.forEach((day) => {
        totalTasks += day.totalTasks;
        completedTasks += day.completedTasks;
        totalCommits += day.totalCommits;
        totalAdditions += day.totalAdditions;
        totalDeletions += day.totalDeletions;
        if (day.totalTasks > 0 || day.totalCommits > 0) {
          activeDays++;
        }
      });

      setData({
        days,
        summary: {
          totalTasks,
          completedTasks,
          totalCommits,
          totalAdditions,
          totalDeletions,
          activeDays,
        },
      });
    } catch (error) {
      console.error("Failed to fetch month data:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, memberId, monthDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
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

  // 날짜별 데이터 맵
  const dayDataMap = new Map(data.days.map((d) => [d.date, d]));

  // 히트맵 강도 계산 (커밋 기준)
  const getHeatmapLevel = (commits: number): number => {
    if (commits === 0) return 0;
    if (commits <= 2) return 1;
    if (commits <= 5) return 2;
    if (commits <= 10) return 3;
    return 4;
  };

  const heatmapColors = [
    "bg-muted", // 0
    "bg-green-200 dark:bg-green-900", // 1
    "bg-green-300 dark:bg-green-700", // 2
    "bg-green-400 dark:bg-green-600", // 3
    "bg-green-500 dark:bg-green-500", // 4
  ];

  const selectedDayData = selectedDate ? dayDataMap.get(selectedDate) : null;

  return (
    <div className="space-y-6">
      {/* 월간 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 활동 일수 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              활동 일수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">{data.summary.activeDays}일</span>
              <span className="text-sm text-muted-foreground">
                / {monthDays.length}일
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 할 일 진행률 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              월간 할 일
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {data.summary.completedTasks}/{data.summary.totalTasks}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* 커밋 요약 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              월간 커밋
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <span className="text-2xl font-bold">{data.summary.totalCommits}</span>
              <p className="text-xs">
                <span className="text-green-600">+{data.summary.totalAdditions}</span>
                {" / "}
                <span className="text-red-600">-{data.summary.totalDeletions}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI 월간 요약 */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="size-4" />
              AI 요약
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">곧 추가됩니다</p>
            <Badge variant="outline" className="mt-1 text-[10px]">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* 히트맵 캘린더 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {format(date, "yyyy년 M월", { locale: ko })} 활동 히트맵
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 캘린더 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateStr = formatKST(day, "yyyy-MM-dd");
              const dayData = dayDataMap.get(dateStr);
              const isCurrentMonth = isSameMonth(day, date);
              const isToday = isSameDay(day, new Date());
              const level = dayData ? getHeatmapLevel(dayData.totalCommits) : 0;
              const isSelected = selectedDate === dateStr;
              const hasActivity = dayData && (dayData.totalTasks > 0 || dayData.totalCommits > 0);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  disabled={!isCurrentMonth}
                  className={cn(
                    "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all relative",
                    isCurrentMonth ? heatmapColors[level] : "bg-transparent",
                    isCurrentMonth && "hover:ring-2 hover:ring-primary/50",
                    isSelected && "ring-2 ring-primary",
                    !isCurrentMonth && "text-muted-foreground/30 cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "font-medium",
                      isToday && "text-primary font-bold",
                      level >= 3 && "text-white dark:text-white"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {hasActivity && isCurrentMonth && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayData.totalTasks > 0 && (
                        <div
                          className={cn(
                            "size-1 rounded-full",
                            level >= 3 ? "bg-white/70" : "bg-blue-500"
                          )}
                        />
                      )}
                      {dayData.totalCommits > 0 && (
                        <div
                          className={cn(
                            "size-1 rounded-full",
                            level >= 3 ? "bg-white" : "bg-green-600"
                          )}
                        />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
            <span>적음</span>
            <div className="flex gap-0.5">
              {heatmapColors.map((color, i) => (
                <div key={i} className={cn("size-3 rounded-sm", color)} />
              ))}
            </div>
            <span>많음</span>
          </div>
        </CardContent>
      </Card>

      {/* 선택된 날짜 상세 */}
      {selectedDayData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {format(new Date(selectedDate!), "M월 d일 (E)", { locale: ko })} 상세
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">할 일</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <span className="font-medium">
                    {selectedDayData.completedTasks}/{selectedDayData.totalTasks}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">커밋</p>
                <div className="flex items-center gap-2">
                  <GitCommit className="size-4" />
                  <span className="font-medium">{selectedDayData.totalCommits}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">추가</p>
                <span className="font-medium text-green-600">
                  +{selectedDayData.totalAdditions}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">삭제</p>
                <span className="font-medium text-red-600">
                  -{selectedDayData.totalDeletions}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
