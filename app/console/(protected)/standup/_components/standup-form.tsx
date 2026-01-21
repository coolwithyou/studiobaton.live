"use client";

import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MentionAutocomplete } from "./mention-autocomplete";
import { Plus, Loader2, CalendarIcon, ChevronDown } from "lucide-react";
import { formatKST, startOfDayKST } from "@/lib/date-utils";
import { addDays, nextMonday, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface StandupFormProps {
  date: Date;
  memberId: string;
  onTaskAdded: () => void;
}

export function StandupForm({ date, memberId, onTaskAdded }: StandupFormProps) {
  const [content, setContent] = useState("");
  const [repository, setRepository] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mentionPopupOpen, setMentionPopupOpen] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState<Date>(date);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  // 빠른 날짜 선택 옵션 계산
  const quickDates = useMemo(() => {
    const today = startOfDayKST(new Date());
    const tomorrow = addDays(today, 1);
    const nextMon = nextMonday(today);

    return [
      { label: "오늘", date: today, isSelected: isSameDay(selectedDueDate, today) },
      { label: "내일", date: tomorrow, isSelected: isSameDay(selectedDueDate, tomorrow) },
      { label: "다음 주 월요일", date: nextMon, isSelected: isSameDay(selectedDueDate, nextMon) },
    ];
  }, [selectedDueDate]);

  // 선택된 날짜가 빠른 옵션에 없는 경우 (캘린더에서 직접 선택)
  const isCustomDate = useMemo(() => {
    return !quickDates.some(q => q.isSelected);
  }, [quickDates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 동기적 중복 제출 방지
    if (submittingRef.current) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await fetch("/api/console/standup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: selectedDueDate.toISOString(),
          memberId,
          content: trimmedContent,
          repository,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add task");
      }

      setContent("");
      setRepository(null);
      // 성공 후 날짜를 현재 보고 있는 날짜로 리셋
      setSelectedDueDate(date);
      onTaskAdded();
    } catch (error) {
      console.error("Failed to add task:", error);
      alert(error instanceof Error ? error.message : "할 일 추가에 실패했습니다.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRepositorySelect = (repo: string) => {
    setRepository(repo);
  };

  // Enter로 제출 (Shift+Enter는 줄바꿈)
  // mention 팝업이 열려있으면 Enter는 repo 선택용으로 사용
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // IME 조합 중일 때는 무시 (한글 등)
    if (e.nativeEvent.isComposing) return;

    // 1차 방어: mention 팝업 열려있으면 Enter는 mention-autocomplete가 처리
    if (mentionPopupOpen) return;

    // 2차 방어: 이미 처리된 이벤트는 무시
    if (e.defaultPrevented) return;

    // 팝업 닫혀있을 때: Enter로 submit, Shift+Enter로 줄바꿈
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (content.trim()) {
        handleSubmit(e);
      }
    }
  };

  // 최대 90일 후까지만 선택 가능
  const maxDate = addDays(new Date(), 90);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 날짜 선택 영역 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          목표 날짜
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {/* 빠른 날짜 버튼 */}
          {quickDates.map((quick) => (
            <Button
              key={quick.label}
              type="button"
              variant={quick.isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDueDate(quick.date)}
              className="h-7 text-xs"
            >
              {quick.label}
            </Button>
          ))}

          {/* 캘린더 피커 */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={isCustomDate ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1",
                  isCustomDate && "min-w-[140px]"
                )}
              >
                <CalendarIcon className="size-3.5" />
                {isCustomDate ? (
                  formatKST(selectedDueDate, "M월 d일 (EEE)")
                ) : (
                  <>
                    직접 선택
                    <ChevronDown className="size-3" />
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDueDate}
                onSelect={(newDate) => {
                  if (newDate) {
                    setSelectedDueDate(newDate);
                    setCalendarOpen(false);
                  }
                }}
                disabled={(d) => d < startOfDayKST(new Date()) || d > maxDate}
                initialFocus
                locale={ko}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 할 일 입력 */}
      <div onKeyDown={handleKeyDown}>
        <MentionAutocomplete
          value={content}
          onChange={setContent}
          onRepositorySelect={handleRepositorySelect}
          onOpenChange={setMentionPopupOpen}
          inputRef={inputRef}
        />
      </div>

      {repository && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>연결된 레포:</span>
          <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
            @{repository}
          </code>
          <button
            type="button"
            onClick={() => setRepository(null)}
            className="text-xs text-destructive hover:underline"
          >
            제거
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!content.trim() || submitting} size="sm">
          {submitting ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Plus className="size-4 mr-2" />
          )}
          할 일 추가
        </Button>
      </div>
    </form>
  );
}
