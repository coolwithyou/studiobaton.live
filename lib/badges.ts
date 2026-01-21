/**
 * 배지 시스템 - 개발자 활동 기반 배지 정의 및 계산
 */

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: BadgeCheckStats) => boolean;
  tier?: number; // 같은 카테고리 내 등급 (높을수록 상위)
  category: "commits" | "streak" | "activity" | "volume";
}

export interface BadgeCheckStats {
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  currentStreak: number;
  longestStreak: number;
  peakHour: number | null;
  activeDays: number;
  featCount?: number;
  fixCount?: number;
  refactorCount?: number;
}

export interface EarnedBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "commits" | "streak" | "activity" | "volume";
  earnedAt?: Date;
}

/**
 * 배지 정의 목록 (기본 세트)
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // 커밋 수 기반 배지
  {
    id: "first_commit",
    name: "첫 커밋",
    description: "첫 번째 커밋을 기록했습니다",
    icon: "🎉",
    category: "commits",
    tier: 1,
    condition: (stats) => stats.totalCommits >= 1,
  },
  {
    id: "commits_100",
    name: "100 커밋",
    description: "100개의 커밋을 달성했습니다",
    icon: "💯",
    category: "commits",
    tier: 2,
    condition: (stats) => stats.totalCommits >= 100,
  },
  {
    id: "commits_500",
    name: "500 커밋",
    description: "500개의 커밋을 달성했습니다",
    icon: "🔥",
    category: "commits",
    tier: 3,
    condition: (stats) => stats.totalCommits >= 500,
  },
  {
    id: "commits_1000",
    name: "1000 커밋",
    description: "1000개의 커밋을 달성했습니다",
    icon: "🚀",
    category: "commits",
    tier: 4,
    condition: (stats) => stats.totalCommits >= 1000,
  },

  // 스트릭 기반 배지
  {
    id: "streak_7",
    name: "7일 연속",
    description: "7일 연속으로 커밋을 기록했습니다",
    icon: "📆",
    category: "streak",
    tier: 1,
    condition: (stats) => stats.longestStreak >= 7,
  },
  {
    id: "streak_30",
    name: "30일 연속",
    description: "30일 연속으로 커밋을 기록했습니다",
    icon: "🗓️",
    category: "streak",
    tier: 2,
    condition: (stats) => stats.longestStreak >= 30,
  },

  // 활동 패턴 기반 배지
  {
    id: "night_owl",
    name: "올빼미",
    description: "주로 밤 시간대(22시-04시)에 코딩합니다",
    icon: "🦉",
    category: "activity",
    tier: 1,
    condition: (stats) =>
      stats.peakHour !== null &&
      (stats.peakHour >= 22 || stats.peakHour <= 4),
  },
  {
    id: "early_bird",
    name: "얼리버드",
    description: "주로 이른 아침(05시-08시)에 코딩합니다",
    icon: "🐦",
    category: "activity",
    tier: 1,
    condition: (stats) =>
      stats.peakHour !== null &&
      stats.peakHour >= 5 &&
      stats.peakHour <= 8,
  },

  // 코드 볼륨 기반 배지
  {
    id: "lines_10k",
    name: "1만 줄",
    description: "총 10,000줄의 코드를 추가했습니다",
    icon: "📝",
    category: "volume",
    tier: 1,
    condition: (stats) => stats.totalAdditions >= 10000,
  },
];

/**
 * 주어진 통계를 기반으로 획득한 배지 목록을 계산합니다.
 */
export function calculateBadges(stats: BadgeCheckStats): string[] {
  return BADGE_DEFINITIONS.filter((badge) => badge.condition(stats)).map(
    (badge) => badge.id
  );
}

/**
 * 배지 ID 목록을 EarnedBadge 객체 배열로 변환합니다.
 */
export function getBadgeDetails(badgeIds: string[]): EarnedBadge[] {
  return badgeIds
    .map((id) => {
      const def = BADGE_DEFINITIONS.find((b) => b.id === id);
      if (!def) return null;
      return {
        id: def.id,
        name: def.name,
        icon: def.icon,
        description: def.description,
        category: def.category,
      };
    })
    .filter((b): b is EarnedBadge => b !== null);
}

/**
 * 새로 획득한 배지를 계산합니다.
 * @param currentBadges 현재 보유 배지 ID 목록
 * @param stats 최신 통계
 * @returns 새로 획득한 배지 ID 목록
 */
export function getNewlyEarnedBadges(
  currentBadges: string[],
  stats: BadgeCheckStats
): string[] {
  const allEarned = calculateBadges(stats);
  const currentSet = new Set(currentBadges);
  return allEarned.filter((id) => !currentSet.has(id));
}

/**
 * 배지를 카테고리별로 그룹화합니다.
 */
export function groupBadgesByCategory(
  badgeIds: string[]
): Record<string, EarnedBadge[]> {
  const badges = getBadgeDetails(badgeIds);
  const grouped: Record<string, EarnedBadge[]> = {
    commits: [],
    streak: [],
    activity: [],
    volume: [],
  };

  for (const badge of badges) {
    const def = BADGE_DEFINITIONS.find((b) => b.id === badge.id);
    if (def) {
      grouped[def.category].push(badge);
    }
  }

  return grouped;
}

/**
 * 다음에 획득할 수 있는 배지와 진행 상황을 반환합니다.
 */
export function getNextBadgeProgress(
  stats: BadgeCheckStats
): Array<{
  badge: BadgeDefinition;
  progress: number; // 0-100
  current: number;
  target: number;
}> {
  const earnedIds = new Set(calculateBadges(stats));
  const progressList: Array<{
    badge: BadgeDefinition;
    progress: number;
    current: number;
    target: number;
  }> = [];

  // 커밋 배지 진행
  const commitTargets = [1, 100, 500, 1000];
  for (const target of commitTargets) {
    const badgeId =
      target === 1
        ? "first_commit"
        : `commits_${target}`;
    if (!earnedIds.has(badgeId)) {
      const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
      if (badge) {
        progressList.push({
          badge,
          progress: Math.min((stats.totalCommits / target) * 100, 100),
          current: stats.totalCommits,
          target,
        });
      }
      break; // 다음 미획득 배지만
    }
  }

  // 스트릭 배지 진행
  const streakTargets = [7, 30];
  for (const target of streakTargets) {
    const badgeId = `streak_${target}`;
    if (!earnedIds.has(badgeId)) {
      const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
      if (badge) {
        progressList.push({
          badge,
          progress: Math.min((stats.longestStreak / target) * 100, 100),
          current: stats.longestStreak,
          target,
        });
      }
      break;
    }
  }

  // 코드 볼륨 배지 진행
  if (!earnedIds.has("lines_10k")) {
    const badge = BADGE_DEFINITIONS.find((b) => b.id === "lines_10k");
    if (badge) {
      progressList.push({
        badge,
        progress: Math.min((stats.totalAdditions / 10000) * 100, 100),
        current: stats.totalAdditions,
        target: 10000,
      });
    }
  }

  return progressList;
}
