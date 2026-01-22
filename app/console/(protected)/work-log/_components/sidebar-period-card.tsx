"use client";

import { useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import { formatKST } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewMode } from "./view-mode-toggle";

interface SidebarPeriodCardProps {
  viewMode: ViewMode;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function SidebarPeriodCard({
  viewMode,
  selectedDate,
  onDateChange,
  onViewModeChange,
}: SidebarPeriodCardProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const viewModeOptions: { value: ViewMode; label: string }[] = [
    { value: "day", label: "일" },
    { value: "week", label: "주" },
    { value: "month", label: "월" },
    { value: "year", label: "년" },
  ];

  // 날짜 범위 텍스트 생성
  const getDateText = () => {
    switch (viewMode) {
      case "day":
        return format(selectedDate, "M월 d일 (E)", { locale: ko });
      case "week":
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, "M/d", { locale: ko })} - ${format(weekEnd, "M/d", { locale: ko })}`;
      case "month":
        return format(selectedDate, "yyyy년 M월", { locale: ko });
      case "year":
        return format(selectedDate, "yyyy년", { locale: ko });
    }
  };

  // 오늘 여부
  const isToday =
    formatKST(selectedDate, "yyyy-MM-dd") === formatKST(new Date(), "yyyy-MM-dd");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="size-4" />
          기간 선택
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* 뷰 모드 선택 */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg">
          {viewModeOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange(option.value)}
              className={cn(
                "h-8 text-xs",
                viewMode === option.value
                  ? "bg-background shadow-sm"
                  : "hover:bg-transparent"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* 현재 선택된 날짜 표시 */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal h-auto py-3"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {viewMode === "day" && "선택된 날짜"}
                  {viewMode === "week" && "선택된 주"}
                  {viewMode === "month" && "선택된 월"}
                  {viewMode === "year" && "선택된 연도"}
                </span>
                <span className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="size-3.5" />
                  {getDateText()}
                  {viewMode === "day" && isToday && (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      오늘
                    </span>
                  )}
                </span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
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

        {/* 오늘 버튼 */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDateChange(new Date())}
          className="w-full"
          disabled={isToday}
        >
          오늘로 이동
        </Button>

        {/* 키보드 단축키 힌트 */}
        <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t">
          <p>
            <kbd className="px-1 py-0.5 bg-muted rounded">←</kbd>{" "}
            <kbd className="px-1 py-0.5 bg-muted rounded">→</kbd> 이동
          </p>
          <p>
            <kbd className="px-1 py-0.5 bg-muted rounded">T</kbd> 오늘
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
