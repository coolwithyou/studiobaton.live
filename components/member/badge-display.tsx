"use client";

import { Award } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
}

interface BadgeDisplayProps {
  badges: BadgeInfo[];
  /** 최대 표시 개수 (0 = 무제한) */
  maxDisplay?: number;
  /** 크기 */
  size?: "sm" | "md" | "lg";
}

export function BadgeDisplay({ badges, maxDisplay = 0, size = "md" }: BadgeDisplayProps) {
  if (badges.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Award className="w-4 h-4" />
        <span>아직 획득한 배지가 없습니다</span>
      </div>
    );
  }

  const displayBadges = maxDisplay > 0 ? badges.slice(0, maxDisplay) : badges;
  const remainingCount = maxDisplay > 0 ? Math.max(0, badges.length - maxDisplay) : 0;

  const sizeClasses = {
    sm: "text-lg p-1.5",
    md: "text-2xl p-2",
    lg: "text-3xl p-3",
  };

  const badgeStyles = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-2">
        {displayBadges.map((badge) => (
          <Tooltip key={badge.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center rounded-full bg-muted/50 border border-border/50",
                  "hover:bg-muted hover:border-border transition-colors cursor-default",
                  badgeStyles[size]
                )}
              >
                <span className={sizeClasses[size]}>{badge.emoji}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <div className="text-center">
                <p className="font-semibold">{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {remainingCount > 0 && (
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-muted/30 text-muted-foreground text-xs font-medium",
              badgeStyles[size]
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

interface BadgeListProps {
  badges: BadgeInfo[];
}

/** 배지 전체 목록 (상세 표시) */
export function BadgeList({ badges }: BadgeListProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Award className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>아직 획득한 배지가 없습니다</p>
        <p className="text-sm">커밋을 계속하면 다양한 배지를 획득할 수 있어요!</p>
      </div>
    );
  }

  // 카테고리별로 그룹화
  const groupedBadges = badges.reduce((acc, badge) => {
    const category = badge.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(badge);
    return acc;
  }, {} as Record<string, BadgeInfo[]>);

  const categoryLabels: Record<string, string> = {
    commits: "커밋 달성",
    streak: "연속 기여",
    time: "활동 시간",
    impact: "코드 영향력",
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            {categoryLabels[category] || category}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categoryBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                  <span className="text-2xl">{badge.emoji}</span>
                </div>
                <div>
                  <p className="font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
