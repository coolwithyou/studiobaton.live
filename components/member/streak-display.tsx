"use client";

import { Flame, Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  /** 컴팩트 모드 (작은 크기) */
  compact?: boolean;
}

export function StreakDisplay({ currentStreak, longestStreak, compact = false }: StreakDisplayProps) {
  const isOnStreak = currentStreak > 0;
  const isAtRecord = currentStreak === longestStreak && longestStreak > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className={cn(
          "flex items-center gap-1",
          isOnStreak ? "text-orange-500" : "text-muted-foreground"
        )}>
          <Flame className={cn("w-4 h-4", isOnStreak && "animate-pulse")} />
          <span className="font-medium">{currentStreak}일 연속</span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>최장 {longestStreak}일</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 현재 스트릭 */}
      <div className={cn(
        "p-4 rounded-lg border text-center transition-colors",
        isOnStreak
          ? "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950"
          : "border-border bg-muted/30"
      )}>
        <div className={cn(
          "flex items-center justify-center gap-2 mb-2",
          isOnStreak ? "text-orange-500" : "text-muted-foreground"
        )}>
          <Flame className={cn("w-5 h-5", isOnStreak && "animate-pulse")} />
          <span className="text-sm font-medium">현재 스트릭</span>
        </div>
        <div className={cn(
          "text-3xl font-bold",
          isOnStreak ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
        )}>
          {currentStreak}
          <span className="text-base font-normal ml-1">일</span>
        </div>
        {isOnStreak && (
          <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
            {isAtRecord ? "🎉 신기록 달성 중!" : "연속 커밋 진행 중"}
          </p>
        )}
      </div>

      {/* 최장 스트릭 */}
      <div className="p-4 rounded-lg border bg-muted/30 text-center">
        <div className="flex items-center justify-center gap-2 mb-2 text-amber-500">
          <Trophy className="w-5 h-5" />
          <span className="text-sm font-medium">최장 스트릭</span>
        </div>
        <div className="text-3xl font-bold text-foreground">
          {longestStreak}
          <span className="text-base font-normal ml-1">일</span>
        </div>
        {longestStreak > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            개인 최고 기록
          </p>
        )}
      </div>
    </div>
  );
}

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
}

/** 작은 배지 형태의 스트릭 표시 */
export function StreakBadge({ currentStreak, longestStreak }: StreakBadgeProps) {
  const isOnStreak = currentStreak > 0;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      isOnStreak
        ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
        : "bg-muted text-muted-foreground"
    )}>
      <Flame className={cn(
        "w-3.5 h-3.5",
        isOnStreak && "text-orange-500"
      )} />
      <span>
        {isOnStreak
          ? `${currentStreak}일 연속`
          : "스트릭 없음"}
      </span>
      {longestStreak > 0 && (
        <>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">최장 {longestStreak}일</span>
        </>
      )}
    </div>
  );
}
