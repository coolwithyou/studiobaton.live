"use client";

import { useState } from "react";
import { format } from "date-fns";
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
import { CalendarDays, CalendarIcon } from "lucide-react";

interface SidebarDateCardProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function SidebarDateCard({
  selectedDate,
  onDateChange,
}: SidebarDateCardProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const isToday =
    formatKST(selectedDate, "yyyy-MM-dd") === formatKST(new Date(), "yyyy-MM-dd");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="size-4" />
          날짜 선택
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* 현재 선택된 날짜 표시 */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal h-auto py-3"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-xs text-muted-foreground">
                  선택된 날짜
                </span>
                <span className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="size-3.5" />
                  {format(selectedDate, "M월 d일 (E)", { locale: ko })}
                  {isToday && (
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
      </CardContent>
    </Card>
  );
}
