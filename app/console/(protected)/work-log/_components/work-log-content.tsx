"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { formatKST } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewModeToggle, ViewMode } from "./view-mode-toggle";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { YearView } from "./year-view";

interface WorkLogContentProps {
  memberId: string;
  memberName: string;
  memberGithubName: string;
}

export function WorkLogContent({
  memberId,
  memberName,
  memberGithubName,
}: WorkLogContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 날짜 네비게이션
  const handlePrevious = useCallback(() => {
    switch (viewMode) {
      case "day":
        setSelectedDate((prev) => subDays(prev, 1));
        break;
      case "week":
        setSelectedDate((prev) => subWeeks(prev, 1));
        break;
      case "month":
        setSelectedDate((prev) => subMonths(prev, 1));
        break;
      case "year":
        setSelectedDate((prev) => new Date(prev.getFullYear() - 1, 0, 1));
        break;
    }
  }, [viewMode]);

  const handleNext = useCallback(() => {
    const now = new Date();
    switch (viewMode) {
      case "day":
        if (selectedDate < now) {
          setSelectedDate((prev) => addDays(prev, 1));
        }
        break;
      case "week":
        if (selectedDate < now) {
          setSelectedDate((prev) => addWeeks(prev, 1));
        }
        break;
      case "month":
        if (selectedDate < now) {
          setSelectedDate((prev) => addMonths(prev, 1));
        }
        break;
      case "year":
        if (selectedDate.getFullYear() < now.getFullYear()) {
          setSelectedDate((prev) => new Date(prev.getFullYear() + 1, 0, 1));
        }
        break;
    }
  }, [viewMode, selectedDate]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 동작하지 않음
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "t":
        case "T":
          handleToday();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevious, handleNext, handleToday]);

  // 날짜 범위 텍스트 생성
  const getDateRangeText = () => {
    switch (viewMode) {
      case "day":
        const isToday =
          formatKST(selectedDate, "yyyy-MM-dd") ===
          formatKST(new Date(), "yyyy-MM-dd");
        return (
          <>
            {format(selectedDate, "yyyy년 M월 d일 (E)", { locale: ko })}
            {isToday && (
              <span className="ml-2 text-xs text-muted-foreground">(오늘)</span>
            )}
          </>
        );
      case "week":
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, "M월 d일", { locale: ko })} - ${format(weekEnd, "M월 d일", { locale: ko })}`;
      case "month":
        return format(selectedDate, "yyyy년 M월", { locale: ko });
      case "year":
        return format(selectedDate, "yyyy년", { locale: ko });
    }
  };

  // 다음 버튼 비활성화 여부
  const isNextDisabled = () => {
    const now = new Date();
    switch (viewMode) {
      case "day":
        return formatKST(selectedDate, "yyyy-MM-dd") >= formatKST(now, "yyyy-MM-dd");
      case "week":
        return endOfWeek(selectedDate, { weekStartsOn: 1 }) >= now;
      case "month":
        return endOfMonth(selectedDate) >= now;
      case "year":
        return selectedDate.getFullYear() >= now.getFullYear();
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더: 뷰 모드 + 날짜 네비게이션 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* 뷰 모드 토글 */}
        <ViewModeToggle value={viewMode} onChange={setViewMode} />

        {/* 날짜 네비게이션 */}
        <div className="flex items-center gap-2">
          {/* 이전 */}
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* 날짜 선택 */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[200px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {getDateRangeText()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={(date) =>
                  date > new Date() || date < new Date("2020-01-01")
                }
                initialFocus
                locale={ko}
              />
            </PopoverContent>
          </Popover>

          {/* 다음 */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={isNextDisabled()}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* 오늘 버튼 */}
          <Button variant="outline" size="sm" onClick={handleToday}>
            오늘
          </Button>
        </div>
      </div>

      {/* 키보드 힌트 */}
      <div className="text-xs text-muted-foreground text-right">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">←</kbd>{" "}
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">→</kbd> 이동
        {" · "}
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">T</kbd> 오늘
      </div>

      {/* 뷰 콘텐츠 */}
      {viewMode === "day" && (
        <DayView
          memberId={memberId}
          memberGithubName={memberGithubName}
          date={selectedDate}
        />
      )}
      {viewMode === "week" && (
        <WeekView
          memberId={memberId}
          memberGithubName={memberGithubName}
          date={selectedDate}
        />
      )}
      {viewMode === "month" && (
        <MonthView
          memberId={memberId}
          memberGithubName={memberGithubName}
          date={selectedDate}
        />
      )}
      {viewMode === "year" && (
        <YearView
          memberId={memberId}
          memberGithubName={memberGithubName}
          date={selectedDate}
        />
      )}
    </div>
  );
}
