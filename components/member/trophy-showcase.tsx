"use client";

import { Trophy as TrophyIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Trophy,
  TrophyRank,
  RANK_COLORS,
  getRankDisplayText,
  getTrophyDefinition,
} from "@/lib/trophies";

interface TrophyCardProps {
  trophy: Trophy;
  /** 크기 */
  size?: "sm" | "md" | "lg";
}

/**
 * 단일 트로피 카드 컴포넌트
 */
export function TrophyCard({ trophy, size = "md" }: TrophyCardProps) {
  const rankColor = RANK_COLORS[trophy.rank];
  const rankText = getRankDisplayText(trophy.rank);
  const definition = getTrophyDefinition(trophy.id);

  const sizeStyles = {
    sm: {
      card: "w-24 h-28 p-2",
      icon: "w-6 h-6",
      title: "text-xs",
      rank: "text-[10px] px-1.5 py-0.5",
      value: "text-sm",
      progress: "h-1",
    },
    md: {
      card: "w-28 h-32 p-3",
      icon: "w-8 h-8",
      title: "text-xs",
      rank: "text-xs px-2 py-0.5",
      value: "text-base",
      progress: "h-1.5",
    },
    lg: {
      card: "w-32 h-36 p-4",
      icon: "w-10 h-10",
      title: "text-sm",
      rank: "text-sm px-2.5 py-1",
      value: "text-lg",
      progress: "h-2",
    },
  };

  const styles = sizeStyles[size];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex flex-col items-center justify-between rounded-lg border bg-card",
              "hover:bg-muted/50 transition-colors cursor-default",
              styles.card
            )}
          >
            {/* 트로피 아이콘 */}
            <div
              className={cn(
                "flex items-center justify-center rounded-full",
                styles.icon
              )}
              style={{
                background: `linear-gradient(135deg, ${rankColor}20, ${rankColor}40)`,
              }}
            >
              <TrophyIcon
                className="w-4/5 h-4/5"
                style={{ color: rankColor }}
              />
            </div>

            {/* 트로피 이름 */}
            <span className={cn("font-medium text-center truncate w-full", styles.title)}>
              {trophy.nameKo}
            </span>

            {/* 랭크 뱃지 */}
            <span
              className={cn(
                "rounded font-bold text-white",
                styles.rank
              )}
              style={{ backgroundColor: rankColor }}
            >
              {rankText}
            </span>

            {/* 값 */}
            <span className={cn("font-bold", styles.value)}>
              {trophy.formattedValue}
            </span>

            {/* 진행률 바 (SSS가 아닌 경우만) */}
            {trophy.rank !== "SSS" && (
              <div className={cn("w-full bg-muted rounded-full overflow-hidden", styles.progress)}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${trophy.progress}%`,
                    backgroundColor: rankColor,
                  }}
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="text-center space-y-1">
            <p className="font-semibold">{trophy.name}</p>
            <p className="text-xs text-muted-foreground">
              {definition?.description}
            </p>
            {trophy.nextThreshold && (
              <p className="text-xs">
                다음 랭크까지:{" "}
                <span className="font-medium">
                  {trophy.nextThreshold.toLocaleString()} {definition?.unitKo}
                </span>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface TrophyShowcaseProps {
  trophies: Trophy[];
  /** 크기 */
  size?: "sm" | "md" | "lg";
  /** 컬럼 수 */
  columns?: 2 | 4;
  /** 빈 상태 표시 여부 */
  showEmpty?: boolean;
}

/**
 * 트로피 쇼케이스 (그리드 레이아웃)
 */
export function TrophyShowcase({
  trophies,
  size = "md",
  columns = 4,
  showEmpty = true,
}: TrophyShowcaseProps) {
  // 유효한 트로피만 필터링 (UNKNOWN 제외)
  const validTrophies = trophies.filter((t) => t.rank !== "UNKNOWN");

  if (validTrophies.length === 0 && showEmpty) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <TrophyIcon className="w-4 h-4" />
        <span>아직 획득한 트로피가 없습니다</span>
      </div>
    );
  }

  if (validTrophies.length === 0) {
    return null;
  }

  const gridCols = columns === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className={cn("grid gap-3", gridCols)}>
      {validTrophies.map((trophy) => (
        <TrophyCard key={trophy.id} trophy={trophy} size={size} />
      ))}
    </div>
  );
}

interface TrophyRankBadgeProps {
  rank: TrophyRank;
  size?: "sm" | "md" | "lg";
}

/**
 * 독립적인 랭크 뱃지 컴포넌트
 */
export function TrophyRankBadge({ rank, size = "md" }: TrophyRankBadgeProps) {
  const rankColor = RANK_COLORS[rank];
  const rankText = getRankDisplayText(rank);

  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <span
      className={cn("rounded font-bold text-white", sizeStyles[size])}
      style={{ backgroundColor: rankColor }}
    >
      {rankText}
    </span>
  );
}

interface TrophySummaryProps {
  trophies: Trophy[];
}

/**
 * 트로피 요약 (평균 랭크 표시)
 */
export function TrophySummary({ trophies }: TrophySummaryProps) {
  const validTrophies = trophies.filter((t) => t.rank !== "UNKNOWN");

  if (validTrophies.length === 0) {
    return null;
  }

  // 최고 랭크 계산
  const rankOrder: TrophyRank[] = ["C", "B", "A", "AA", "AAA", "S", "SS", "SSS"];
  const highestRank = validTrophies.reduce((highest, trophy) => {
    const currentIndex = rankOrder.indexOf(trophy.rank);
    const highestIndex = rankOrder.indexOf(highest);
    return currentIndex > highestIndex ? trophy.rank : highest;
  }, "C" as TrophyRank);

  // SSS 트로피 수
  const sssCount = validTrophies.filter((t) => t.rank === "SSS").length;

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <TrophyIcon className="w-4 h-4" style={{ color: RANK_COLORS[highestRank] }} />
        <span className="text-muted-foreground">최고 랭크</span>
        <TrophyRankBadge rank={highestRank} size="sm" />
      </div>
      {sssCount > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">SSS</span>
          <span className="font-bold" style={{ color: RANK_COLORS.SSS }}>
            {sssCount}개
          </span>
        </div>
      )}
    </div>
  );
}
