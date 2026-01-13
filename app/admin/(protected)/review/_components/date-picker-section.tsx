"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface DatePickerSectionProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DatePickerSection({ selectedDate, onDateChange }: DatePickerSectionProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">날짜 선택:</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 size-4" />
            {format(selectedDate, "PPP", { locale: ko })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
            initialFocus
            locale={ko}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
