"use client";

import { useState, useCallback, useEffect } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isAfter,
  getDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { formatKST } from "@/lib/date-utils";
import { ChevronLeft, ChevronRight, Check, Loader2, FileEdit, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommitStat {
  date: string;
  commitCount: number;
  hasPost: boolean;
  postStatus: string | null;
  versionCount: number;
}

interface Holiday {
  date: string;
  name: string;
}

interface GenerateCalendarProps {
  selectedDates: Date[];
  onDateSelect: (date: Date) => void;
  onRangeSelect: (start: Date, end: Date) => void;
  selectionMode: "single" | "range";
  rangeStart: Date | null;
  rangeEnd: Date | null;
}

export function GenerateCalendar({
  selectedDates,
  onDateSelect,
  onRangeSelect,
  selectionMode,
  rangeStart,
  rangeEnd,
}: GenerateCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [commitStats, setCommitStats] = useState<Map<string, CommitStat>>(
    new Map()
  );
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [holidayNames, setHolidayNames] = useState<Map<string, string>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [shiftPressed, setShiftPressed] = useState(false);

  const today = new Date();

  // Shift 키 감지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const year = currentMonth.getFullYear();

      // 커밋 통계와 공휴일 병렬 로드
      const [statsRes, holidaysRes] = await Promise.all([
        fetch(
          `/api/admin/commits/stats?startDate=${formatKST(monthStart, "yyyy-MM-dd")}&endDate=${formatKST(monthEnd, "yyyy-MM-dd")}`
        ),
        fetch(`/api/admin/holidays?year=${year}`),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        const statsMap = new Map<string, CommitStat>();
        for (const stat of data.stats) {
          statsMap.set(stat.date, stat);
        }
        setCommitStats(statsMap);
      }

      if (holidaysRes.ok) {
        const data = await holidaysRes.json();
        const holidaySet = new Set<string>();
        const namesMap = new Map<string, string>();
        for (const holiday of data.holidays) {
          holidaySet.add(holiday.date);
          namesMap.set(holiday.date, holiday.name);
        }
        setHolidays(holidaySet);
        setHolidayNames(namesMap);
      }
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (date: Date) => {
    // 미래 날짜는 선택 불가
    if (isAfter(date, today)) return;

    if (selectionMode === "range" || shiftPressed) {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // 새로운 범위 시작
        onDateSelect(date);
      } else {
        // 범위 완성
        if (date < rangeStart) {
          onRangeSelect(date, rangeStart);
        } else {
          onRangeSelect(rangeStart, date);
        }
      }
    } else {
      onDateSelect(date);
    }
  };

  const isInRange = (date: Date): boolean => {
    if (!rangeStart || !rangeEnd) return false;
    return date >= rangeStart && date <= rangeEnd;
  };

  const isSelected = (date: Date): boolean => {
    return selectedDates.some((d) => isSameDay(d, date));
  };

  const getCommitIntensity = (count: number): string => {
    if (count === 0) return "bg-muted/30";
    if (count < 5) return "bg-yellow-100 dark:bg-yellow-900/30";
    if (count < 10) return "bg-green-100 dark:bg-green-900/30";
    if (count < 20) return "bg-green-200 dark:bg-green-800/40";
    return "bg-green-300 dark:bg-green-700/50";
  };

  // 캘린더 그리드 생성
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {formatKST(currentMonth, "yyyy년 M월")}
        </h2>
        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="flex items-center justify-center py-2 mb-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">
            데이터 로딩 중...
          </span>
        </div>
      )}

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "text-center text-sm font-medium py-2",
              index === 0 && "text-red-500",
              index === 6 && "text-blue-500"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = formatKST(day, "yyyy-MM-dd");
          const stat = commitStats.get(dateKey);
          const isHoliday = holidays.has(dateKey);
          const holidayName = holidayNames.get(dateKey);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isFuture = isAfter(day, today);
          const isToday = isSameDay(day, today);
          const dayOfWeek = getDay(day);
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;
          const selected = isSelected(day);
          const inRange = isInRange(day);

          return (
            <button
              key={dateKey}
              onClick={() => handleDayClick(day)}
              disabled={isFuture || !isCurrentMonth}
              title={
                holidayName ||
                (stat ? `${stat.commitCount}개 커밋` : "커밋 없음")
              }
              className={cn(
                "relative aspect-square p-1 rounded-md transition-colors",
                "flex flex-col items-center justify-start",
                "text-sm",
                !isCurrentMonth && "opacity-30",
                isFuture && "opacity-30 cursor-not-allowed",
                isCurrentMonth &&
                  !isFuture &&
                  stat &&
                  getCommitIntensity(stat.commitCount),
                selected && "ring-2 ring-primary ring-offset-2",
                inRange &&
                  !selected &&
                  "bg-primary/20 dark:bg-primary/30",
                isToday && "font-bold",
                (isHoliday || isSunday) && "text-red-500",
                isSaturday && !isHoliday && "text-blue-500",
                !isFuture &&
                  isCurrentMonth &&
                  "hover:bg-accent cursor-pointer"
              )}
            >
              <span className="text-xs">{formatKST(day, "d")}</span>
              {stat && isCurrentMonth && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {/* 발행됨 */}
                  {stat.postStatus === "PUBLISHED" && (
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  )}
                  {/* 버전 있음 (DRAFT) */}
                  {stat.hasPost && stat.versionCount > 0 && stat.postStatus === "DRAFT" && (
                    <FileEdit className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  )}
                  {/* 커밋 수집됨 (버전 없음) */}
                  {stat.hasPost && stat.versionCount === 0 && (
                    <Download className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                  )}
                  {stat.commitCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {stat.commitCount}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-800/40" />
          <span>커밋 수</span>
        </div>
        <div className="flex items-center gap-1">
          <Check className="h-3 w-3 text-green-600" />
          <span>Post 있음</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-500">빨강</span>
          <span>공휴일/일요일</span>
        </div>
      </div>

      {/* 도움말 */}
      <p className="mt-2 text-xs text-muted-foreground">
        Shift+클릭으로 구간 선택이 가능합니다.
      </p>
    </div>
  );
}
