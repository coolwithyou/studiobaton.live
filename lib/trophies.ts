/**
 * 트로피 시스템 - github-profile-trophy 스타일 랭크 기반 트로피
 *
 * 8단계 랭크: C → B → A → AA → AAA → S → SS → SSS
 * 4개 트로피 카테고리: Commits, Streak, Active Days, Lines
 */

// 랭크 정의 (낮은 순서대로)
export const TROPHY_RANKS = [
  "C",
  "B",
  "A",
  "AA",
  "AAA",
  "S",
  "SS",
  "SSS",
] as const;

export type TrophyRank = (typeof TROPHY_RANKS)[number] | "UNKNOWN";

export type TrophyCategory = "commits" | "streak" | "activeDays" | "lines";

export interface TrophyDefinition {
  id: TrophyCategory;
  name: string;
  nameKo: string;
  description: string;
  unit: string;
  unitKo: string;
  thresholds: Record<Exclude<TrophyRank, "UNKNOWN">, number>;
}

export interface Trophy {
  id: TrophyCategory;
  name: string;
  nameKo: string;
  rank: TrophyRank;
  currentValue: number;
  formattedValue: string;
  nextThreshold: number | null;
  progress: number; // 0-100 (다음 랭크까지 진행률)
}

export interface TrophyStats {
  totalCommits: number;
  longestStreak: number;
  activeDays: number;
  totalAdditions: number;
}

/**
 * 트로피 정의
 */
export const TROPHY_DEFINITIONS: TrophyDefinition[] = [
  {
    id: "commits",
    name: "Commits",
    nameKo: "커밋",
    description: "Total number of commits",
    unit: "commits",
    unitKo: "커밋",
    thresholds: {
      C: 1,
      B: 10,
      A: 50,
      AA: 100,
      AAA: 250,
      S: 500,
      SS: 1000,
      SSS: 2000,
    },
  },
  {
    id: "streak",
    name: "Streak",
    nameKo: "연속 커밋",
    description: "Longest commit streak (days)",
    unit: "days",
    unitKo: "일",
    thresholds: {
      C: 1,
      B: 3,
      A: 7,
      AA: 14,
      AAA: 30,
      S: 60,
      SS: 100,
      SSS: 180,
    },
  },
  {
    id: "activeDays",
    name: "Active Days",
    nameKo: "활동일",
    description: "Total active days",
    unit: "days",
    unitKo: "일",
    thresholds: {
      C: 1,
      B: 7,
      A: 30,
      AA: 60,
      AAA: 120,
      S: 200,
      SS: 300,
      SSS: 500,
    },
  },
  {
    id: "lines",
    name: "Lines",
    nameKo: "코드 라인",
    description: "Total lines added",
    unit: "lines",
    unitKo: "줄",
    thresholds: {
      C: 100,
      B: 1000,
      A: 5000,
      AA: 10000,
      AAA: 30000,
      S: 50000,
      SS: 100000,
      SSS: 200000,
    },
  },
];

/**
 * 랭크별 색상 (github-profile-trophy 스타일)
 */
export const RANK_COLORS: Record<TrophyRank, string> = {
  SSS: "#FFD700", // Gold
  SS: "#C9B037", // Dark Gold
  S: "#B4A033", // Bronze Gold
  AAA: "#A0A0A0", // Silver
  AA: "#8C8C8C", // Dark Silver
  A: "#787878", // Gray Silver
  B: "#CD7F32", // Bronze
  C: "#A97142", // Dark Bronze
  UNKNOWN: "#666666", // Gray
};

/**
 * 랭크별 배경 그라데이션 색상
 */
export const RANK_GRADIENTS: Record<
  TrophyRank,
  { start: string; end: string }
> = {
  SSS: { start: "#FFD700", end: "#FFA500" },
  SS: { start: "#E6C200", end: "#CC9900" },
  S: { start: "#D4AF37", end: "#B8860B" },
  AAA: { start: "#C0C0C0", end: "#A8A8A8" },
  AA: { start: "#A0A0A0", end: "#888888" },
  A: { start: "#909090", end: "#707070" },
  B: { start: "#CD7F32", end: "#A0522D" },
  C: { start: "#A97142", end: "#8B4513" },
  UNKNOWN: { start: "#808080", end: "#606060" },
};

/**
 * 값을 기반으로 랭크 계산
 */
export function calculateTrophyRank(
  value: number,
  thresholds: Record<Exclude<TrophyRank, "UNKNOWN">, number>
): TrophyRank {
  if (value < thresholds.C) return "UNKNOWN";

  // 높은 랭크부터 체크
  const ranksDesc = [...TROPHY_RANKS].reverse();
  for (const rank of ranksDesc) {
    if (value >= thresholds[rank]) {
      return rank;
    }
  }

  return "UNKNOWN";
}

/**
 * 다음 랭크 가져오기
 */
export function getNextRank(
  currentRank: TrophyRank
): Exclude<TrophyRank, "UNKNOWN"> | null {
  if (currentRank === "UNKNOWN") return "C";
  if (currentRank === "SSS") return null;

  const currentIndex = TROPHY_RANKS.indexOf(
    currentRank as (typeof TROPHY_RANKS)[number]
  );
  if (currentIndex === -1 || currentIndex >= TROPHY_RANKS.length - 1)
    return null;

  return TROPHY_RANKS[currentIndex + 1];
}

/**
 * 숫자 포맷팅 (1000 → 1K, 1000000 → 1M)
 */
export function formatValue(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return value.toLocaleString();
}

/**
 * 통계를 기반으로 모든 트로피 계산
 */
export function calculateTrophies(stats: TrophyStats): Trophy[] {
  const valueMap: Record<TrophyCategory, number> = {
    commits: stats.totalCommits,
    streak: stats.longestStreak,
    activeDays: stats.activeDays,
    lines: stats.totalAdditions,
  };

  return TROPHY_DEFINITIONS.map((def) => {
    const value = valueMap[def.id];
    const rank = calculateTrophyRank(value, def.thresholds);
    const nextRank = getNextRank(rank);
    const nextThreshold = nextRank ? def.thresholds[nextRank] : null;

    // 진행률 계산
    let progress = 0;
    if (rank === "SSS") {
      progress = 100;
    } else if (nextThreshold !== null) {
      const currentThreshold =
        rank === "UNKNOWN" ? 0 : def.thresholds[rank as Exclude<TrophyRank, "UNKNOWN">];
      const range = nextThreshold - currentThreshold;
      const currentProgress = value - currentThreshold;
      progress = Math.min(Math.round((currentProgress / range) * 100), 100);
    }

    return {
      id: def.id,
      name: def.name,
      nameKo: def.nameKo,
      rank,
      currentValue: value,
      formattedValue: formatValue(value),
      nextThreshold,
      progress,
    };
  });
}

/**
 * 랭크 색상 가져오기
 */
export function getRankColor(rank: TrophyRank): string {
  return RANK_COLORS[rank];
}

/**
 * 랭크 표시 텍스트 (SSS, SS 등)
 */
export function getRankDisplayText(rank: TrophyRank): string {
  return rank === "UNKNOWN" ? "?" : rank;
}

/**
 * 랭크 레벨 (숫자로 변환, 정렬용)
 */
export function getRankLevel(rank: TrophyRank): number {
  if (rank === "UNKNOWN") return -1;
  return TROPHY_RANKS.indexOf(rank as (typeof TROPHY_RANKS)[number]);
}

/**
 * 트로피 정의 가져오기
 */
export function getTrophyDefinition(
  id: TrophyCategory
): TrophyDefinition | undefined {
  return TROPHY_DEFINITIONS.find((d) => d.id === id);
}

/**
 * 전체 트로피 점수 계산 (모든 랭크 레벨 합산)
 */
export function calculateTotalTrophyScore(trophies: Trophy[]): number {
  return trophies.reduce((sum, trophy) => sum + getRankLevel(trophy.rank), 0);
}

/**
 * 평균 랭크 계산
 */
export function calculateAverageRank(trophies: Trophy[]): TrophyRank {
  const validTrophies = trophies.filter((t) => t.rank !== "UNKNOWN");
  if (validTrophies.length === 0) return "UNKNOWN";

  const avgLevel =
    validTrophies.reduce((sum, t) => sum + getRankLevel(t.rank), 0) /
    validTrophies.length;

  const roundedLevel = Math.round(avgLevel);
  return TROPHY_RANKS[Math.min(roundedLevel, TROPHY_RANKS.length - 1)];
}
