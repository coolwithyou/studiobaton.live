"use client";

import { useMemo } from "react";
import { startOfWeek, eachDayOfInterval, startOfYear } from "date-fns";
import { formatKST, nowKST } from "@/lib/date-utils";
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
  /** 표시할 연도 (기본: 현재 연도) */
  year?: number;
}

const CELL_SIZE = 10;
const CELL_GAP = 2;
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

export function ContributionHeatmap({ data, year }: ContributionHeatmapProps) {
  const currentYear = year ?? new Date().getFullYear();

  const { weeks, monthLabels, totalContributions, todayStr } = useMemo(() => {
    // KST 기준 오늘 날짜 (서버에서 KST 기준으로 데이터를 보내므로 동일하게 처리)
    const todayKST = nowKST();
    const todayStr = formatKST(todayKST, "yyyy-MM-dd");

    // 연도 전체를 표시 (1월 1일 ~ 12월 31일)
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const endDate = new Date(currentYear, 11, 31);

    // 연도 시작일이 속한 주의 시작(일요일)부터 시작
    const startDate = startOfWeek(yearStart, { weekStartsOn: 0 });

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // 데이터를 날짜 맵으로 변환
    const dataMap = new Map<string, number>();
    data.forEach((d) => {
      dataMap.set(d.date, d.count);
    });

    // 주 단위로 그룹화
    const weeks: Array<Array<{ date: Date; dateStr: string; count: number; isCurrentYear: boolean; isFuture: boolean }>> = [];
    let currentWeek: Array<{ date: Date; dateStr: string; count: number; isCurrentYear: boolean; isFuture: boolean }> = [];

    allDays.forEach((date, index) => {
      // KST 기준으로 날짜 문자열 생성 (서버 데이터와 동일한 기준)
      const dateStr = formatKST(date, "yyyy-MM-dd");
      const count = dataMap.get(dateStr) || 0;
      const isCurrentYear = date.getFullYear() === currentYear;
      const isFuture = dateStr > todayStr;

      currentWeek.push({ date, dateStr, count, isCurrentYear, isFuture });

      if (date.getDay() === 6 || index === allDays.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // 월 라벨 위치 계산 - 해당 월의 첫 주에만 라벨 표시
    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      // 해당 주에서 현재 연도에 해당하는 첫 날짜를 찾음
      const firstDayOfCurrentYear = week.find(d => d.isCurrentYear);
      if (firstDayOfCurrentYear) {
        const month = firstDayOfCurrentYear.date.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            label: MONTHS_LABELS[month],
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    // 현재 연도의 총 기여 수 계산
    const totalContributions = data
      .filter(d => d.date.startsWith(`${currentYear}-`))
      .reduce((sum, d) => sum + d.count, 0);

    return { weeks, monthLabels, totalContributions, todayStr };
  }, [data, currentYear]);

  // 히트맵 전체 너비 계산
  const heatmapWidth = weeks.length * (CELL_SIZE + CELL_GAP) + 28; // 28은 요일 라벨 영역

  return (
    <div className="space-y-2">
      {/* 통계 헤더 */}
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{currentYear}년</span> 기여 현황 ·
        <span className="font-semibold text-foreground ml-1">{totalContributions.toLocaleString()}개</span> 커밋
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="overflow-x-auto pb-2">
          {/* 히트맵을 중앙 정렬하여 좌우 균형 유지 */}
          <div className="flex justify-center">
            <div style={{ minWidth: heatmapWidth }}>
            {/* 월 라벨 */}
            <div
              className="relative text-xs text-muted-foreground mb-1 h-4"
              style={{ marginLeft: 28 }}
            >
              {monthLabels.map((month, idx) => (
                <div
                  key={idx}
                  className="absolute whitespace-nowrap"
                  style={{
                    left: month.weekIndex * (CELL_SIZE + CELL_GAP),
                  }}
                >
                  {month.label}
                </div>
              ))}
            </div>

            <div className="flex gap-0.5">
              {/* 요일 라벨 */}
              <div
                className="flex flex-col text-xs text-muted-foreground mr-1 shrink-0"
                style={{ gap: CELL_GAP }}
              >
                {DAYS_LABELS.map((label, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-end pr-1"
                    style={{
                      height: CELL_SIZE,
                      width: 20,
                      fontSize: 9,
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
                      // KST 기준 문자열 비교로 오늘 여부 확인
                      const isToday = day.dateStr === todayStr;
                      // 현재 연도가 아닌 날짜는 흐리게 표시
                      const isOutsideYear = !day.isCurrentYear;
                      const isFuture = day.isFuture;

                      return (
                        <Tooltip key={dayIdx}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "rounded-[2px] transition-colors cursor-default",
                                isOutsideYear
                                  ? "bg-transparent"
                                  : isFuture
                                    ? "bg-muted/50"
                                    : intensityColors[level],
                                isToday && "ring-1 ring-foreground ring-offset-1 ring-offset-background"
                              )}
                              style={{
                                width: CELL_SIZE,
                                height: CELL_SIZE,
                              }}
                            />
                          </TooltipTrigger>
                          {!isOutsideYear && (
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-semibold">
                                {isFuture
                                  ? "예정"
                                  : day.count > 0
                                    ? `${day.count}개 커밋`
                                    : "커밋 없음"}
                              </p>
                              <p className="text-muted-foreground">
                                {formatKST(day.date, "M월 d일 (eee)")}
                              </p>
                            </TooltipContent>
                          )}
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
                    className={cn("rounded-[2px]", color)}
                    style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  />
                ))}
              </div>
              <span>많음</span>
            </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
