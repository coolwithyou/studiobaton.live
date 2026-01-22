"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  endOfWeek,
  endOfMonth,
} from "date-fns";
import { formatKST } from "@/lib/date-utils";
import { SidebarMemberCard } from "./sidebar-member-card";
import { SidebarPeriodCard } from "./sidebar-period-card";
import { SidebarCacheCard } from "./sidebar-cache-card";
import { ViewMode } from "./view-mode-toggle";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { YearView } from "./year-view";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  githubName: string;
  isLinked: boolean;
}

interface WorkLogLayoutProps {
  members: Member[];
  currentMember: {
    id: string;
    name: string;
    githubName: string;
  };
}

export function WorkLogLayout({ members, currentMember }: WorkLogLayoutProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  return (
    <div className="flex gap-6">
      {/* 좌측 사이드 패널 */}
      <aside className="w-64 shrink-0 space-y-4 hidden lg:block">
        <SidebarMemberCard
          members={members}
          currentGithubName={currentMember.githubName}
        />
        <SidebarPeriodCard
          viewMode={viewMode}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onViewModeChange={setViewMode}
        />
        <SidebarCacheCard memberId={currentMember.id} />
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 min-w-0">
        {/* 모바일용 컴팩트 헤더 */}
        <div className="lg:hidden mb-6 space-y-4">
          <SidebarMemberCard
            members={members}
            currentGithubName={currentMember.githubName}
          />
          <SidebarPeriodCard
            viewMode={viewMode}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onViewModeChange={setViewMode}
          />
          <SidebarCacheCard memberId={currentMember.id} />
        </div>

        {/* 뷰 콘텐츠 */}
        {viewMode === "day" && (
          <DayView
            memberId={currentMember.id}
            memberGithubName={currentMember.githubName}
            date={selectedDate}
          />
        )}
        {viewMode === "week" && (
          <WeekView
            memberId={currentMember.id}
            memberGithubName={currentMember.githubName}
            date={selectedDate}
          />
        )}
        {viewMode === "month" && (
          <MonthView
            memberId={currentMember.id}
            memberGithubName={currentMember.githubName}
            date={selectedDate}
          />
        )}
        {viewMode === "year" && (
          <YearView
            memberId={currentMember.id}
            memberGithubName={currentMember.githubName}
            date={selectedDate}
          />
        )}
      </main>
    </div>
  );
}
