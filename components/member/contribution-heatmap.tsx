"use client";

import { useMemo } from "react";
import { format, subDays, startOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HeatmapData {
  date: string;
  count: number;
}

interface ContributionHeatmapProps {
  data: HeatmapData[];
  /** 히트맵에 표시할 일 수 (기본: 365) */
  days?: number;
}

const CELL_SIZE = 11;
const CELL_GAP = 3;
const DAYS_IN_WEEK = 7;
const MONTHS_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const DAYS_LABELS = ["", "월", "", "수", "", "금", ""];

function getIntensityLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

const intensityColors = [
  "bg-muted",
  "bg-green-200 dark:bg-green-900",
  "bg-green-400 dark:bg-green-700",
  "bg-green-600 dark:bg-green-500",
  "bg-green-800 dark:bg-green-300",
];

export function ContributionHeatmap({ data, days = 365 }: ContributionHeatmapProps) {
  const { weeks, monthLabels, totalContributions } = useMemo(() => {
    const today = new Date();
    const endDate = today;
    const startDate = startOfWeek(subDays(today, days), { weekStartsOn: 0 });

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // 데이터를 날짜 맵으로 변환
    const dataMap = new Map<string, number>();
    data.forEach((d) => {
      dataMap.set(d.date, d.count);
    });

    // 주 단위로 그룹화
    const weeks: Array<Array<{ date: Date; count: number }>> = [];
    let currentWeek: Array<{ date: Date; count: number }> = [];

    allDays.forEach((date, index) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const count = dataMap.get(dateStr) || 0;

      currentWeek.push({ date, count });

      if ((index + 1) % DAYS_IN_WEEK === 0 || index === allDays.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // 월 라벨 위치 계산
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            label: MONTHS_LABELS[month],
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    // 총 기여 수 계산
    const totalContributions = data.reduce((sum, d) => sum + d.count, 0);

    return { weeks, monthLabels, totalContributions };
  }, [data, days]);

  return (
    <div className="space-y-2">
      {/* 통계 헤더 */}
      <div className="text-sm text-muted-foreground">
        지난 {days}일간 <span className="font-semibold text-foreground">{totalContributions.toLocaleString()}개</span> 커밋
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="overflow-x-auto pb-2">
          <div className="inline-block">
            {/* 월 라벨 */}
            <div
              className="flex text-xs text-muted-foreground mb-1"
              style={{ marginLeft: 28 }}
            >
              {monthLabels.map((month, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "absolute",
                    left: 28 + month.weekIndex * (CELL_SIZE + CELL_GAP),
                  }}
                >
                  {month.label}
                </div>
              ))}
            </div>

            <div className="flex gap-0.5 mt-5">
              {/* 요일 라벨 */}
              <div
                className="flex flex-col text-xs text-muted-foreground mr-1"
                style={{ gap: CELL_GAP }}
              >
                {DAYS_LABELS.map((label, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: CELL_SIZE,
                      width: 20,
                      lineHeight: `${CELL_SIZE}px`,
                      fontSize: 10,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* 히트맵 셀 */}
              <div className="flex" style={{ gap: CELL_GAP }}>
                {weeks.map((week, weekIdx) => (
                  <div
                    key={weekIdx}
                    className="flex flex-col"
                    style={{ gap: CELL_GAP }}
                  >
                    {week.map((day, dayIdx) => {
                      const level = getIntensityLevel(day.count);
                      const isToday = isSameDay(day.date, new Date());

                      return (
                        <Tooltip key={dayIdx}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "rounded-sm transition-colors cursor-default",
                                intensityColors[level],
                                isToday && "ring-1 ring-foreground ring-offset-1 ring-offset-background"
                              )}
                              style={{
                                width: CELL_SIZE,
                                height: CELL_SIZE,
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-semibold">
                              {day.count > 0
                                ? `${day.count}개 커밋`
                                : "커밋 없음"}
                            </p>
                            <p className="text-muted-foreground">
                              {format(day.date, "yyyy년 M월 d일 (eee)", { locale: ko })}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
              <span>적음</span>
              <div className="flex gap-0.5">
                {intensityColors.map((color, idx) => (
                  <div
                    key={idx}
                    className={cn("rounded-sm", color)}
                    style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  />
                ))}
              </div>
              <span>많음</span>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
