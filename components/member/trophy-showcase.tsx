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

// 랭크별 그라데이션 색상 (github-profile-trophy 스타일)
const RANK_GRADIENTS: Record<TrophyRank, { base: string; shadow: string }> = {
  SSS: { base: "#FFD700", shadow: "#FFA500" }, // Gold
  SS: { base: "#FFD700", shadow: "#DAA520" }, // Gold
  S: { base: "#FFD700", shadow: "#B8860B" }, // Gold
  AAA: { base: "#C0C0C0", shadow: "#A9A9A9" }, // Silver
  AA: { base: "#C0C0C0", shadow: "#808080" }, // Silver
  A: { base: "#C0C0C0", shadow: "#696969" }, // Silver
  B: { base: "#CD7F32", shadow: "#8B4513" }, // Bronze
  C: { base: "#6A5ACD", shadow: "#483D8B" }, // Purple
  UNKNOWN: { base: "#808080", shadow: "#696969" },
};

/**
 * 트로피 컵 SVG 컴포넌트 (github-profile-trophy 스타일)
 */
function TrophyCupIcon({
  rank,
  size = 40,
  className,
}: {
  rank: TrophyRank;
  size?: number;
  className?: string;
}) {
  const colors = RANK_GRADIENTS[rank];
  const gradientId = `trophy-gradient-${rank}-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.base} />
          <stop offset="100%" stopColor={colors.shadow} />
        </linearGradient>
      </defs>
      {/* 트로피 손잡이 (좌우 원형) */}
      <path
        fillRule="evenodd"
        d="M12.5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-3 2a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-3 2a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"
        fill={`url(#${gradientId})`}
      />
      {/* 트로피 컵 본체 */}
      <path
        d="M3 1h10c-.495 3.467-.5 10-5 10S3.495 4.467 3 1z"
        fill={`url(#${gradientId})`}
      />
      {/* 트로피 받침대 */}
      <path
        d="M3 15a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1H3zm2-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1H5z"
        fill={`url(#${gradientId})`}
      />
      {/* 트로피 기둥 */}
      <path d="M7 10h2v4H7v-4z" fill={`url(#${gradientId})`} />
      {/* 트로피 컵 하단 장식 */}
      <path
        d="M10 11c0 .552-.895 1-2 1s-2-.448-2-1 .895-1 2-1 2 .448 2 1z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

/**
 * 월계관 배경 SVG (S랭크 이상)
 */
function LaurelBackground({
  size = 80,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={cn("absolute inset-0 opacity-20", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 왼쪽 월계관 */}
      <path
        d="M20 70 Q10 50 20 30 Q15 35 10 50 Q15 65 20 70"
        fill="currentColor"
      />
      <path
        d="M25 65 Q18 50 25 35 Q20 40 18 50 Q20 60 25 65"
        fill="currentColor"
      />
      <path
        d="M30 60 Q25 50 30 40 Q26 44 25 50 Q26 56 30 60"
        fill="currentColor"
      />
      {/* 오른쪽 월계관 */}
      <path
        d="M60 70 Q70 50 60 30 Q65 35 70 50 Q65 65 60 70"
        fill="currentColor"
      />
      <path
        d="M55 65 Q62 50 55 35 Q60 40 62 50 Q60 60 55 65"
        fill="currentColor"
      />
      <path
        d="M50 60 Q55 50 50 40 Q54 44 55 50 Q54 56 50 60"
        fill="currentColor"
      />
    </svg>
  );
}

interface TrophyCardProps {
  trophy: Trophy;
  /** 크기 */
  size?: "sm" | "md" | "lg";
}

/**
 * 단일 트로피 카드 컴포넌트 (github-profile-trophy 스타일)
 */
export function TrophyCard({ trophy, size = "md" }: TrophyCardProps) {
  const rankColor = RANK_COLORS[trophy.rank];
  const rankText = getRankDisplayText(trophy.rank);
  const definition = getTrophyDefinition(trophy.id);
  const showLaurel = ["SSS", "SS", "S"].includes(trophy.rank);

  const sizeStyles = {
    sm: {
      card: "w-24 h-30 p-2",
      iconContainer: "w-14 h-14",
      icon: 28,
      laurel: 56,
      title: "text-xs",
      rank: "text-[10px] px-1.5 py-0.5",
      value: "text-sm",
      progress: "h-1",
    },
    md: {
      card: "w-28 h-36 p-3",
      iconContainer: "w-16 h-16",
      icon: 36,
      laurel: 64,
      title: "text-xs",
      rank: "text-xs px-2 py-0.5",
      value: "text-base",
      progress: "h-1.5",
    },
    lg: {
      card: "w-32 h-40 p-4",
      iconContainer: "w-20 h-20",
      icon: 44,
      laurel: 80,
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
            {/* 트로피 아이콘 영역 */}
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full bg-muted/50",
                styles.iconContainer
              )}
            >
              {/* 월계관 배경 (S랭크 이상) */}
              {showLaurel && (
                <LaurelBackground
                  size={styles.laurel}
                  className="text-green-500"
                />
              )}
              {/* 트로피 아이콘 */}
              <TrophyCupIcon rank={trophy.rank} size={styles.icon} />
            </div>

            {/* 랭크 뱃지 */}
            <span
              className={cn("rounded font-bold text-white", styles.rank)}
              style={{ backgroundColor: rankColor }}
            >
              {rankText}
            </span>

            {/* 트로피 이름 */}
            <span
              className={cn(
                "font-medium text-center truncate w-full",
                styles.title
              )}
            >
              {trophy.nameKo}
            </span>

            {/* 값 */}
            <span className={cn("font-bold", styles.value)}>
              {trophy.formattedValue}
            </span>

            {/* 진행률 바 (SSS가 아닌 경우만) */}
            {trophy.rank !== "SSS" && (
              <div
                className={cn(
                  "w-full bg-muted rounded-full overflow-hidden",
                  styles.progress
                )}
              >
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
  columns?: 2 | 3 | 4 | 6;
  /** 빈 상태 표시 여부 */
  showEmpty?: boolean;
}

/**
 * 트로피 쇼케이스 (그리드 레이아웃)
 */
export function TrophyShowcase({
  trophies,
  size = "md",
  columns = 3,
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

  // 반응형 그리드 컬럼 설정
  const gridColsMap: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };
  const gridCols = gridColsMap[columns] || gridColsMap[3];

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
  const rankOrder: TrophyRank[] = [
    "C",
    "B",
    "A",
    "AA",
    "AAA",
    "S",
    "SS",
    "SSS",
  ];
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
        <TrophyCupIcon rank={highestRank} size={16} />
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
