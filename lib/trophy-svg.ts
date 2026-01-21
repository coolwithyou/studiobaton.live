/**
 * 트로피 SVG 생성 유틸리티
 * github-profile-trophy 스타일의 SVG 트로피 카드 생성
 *
 * 원본 참고: https://github.com/ryo-ma/github-profile-trophy
 */

import {
  Trophy,
  TrophyRank,
  RANK_COLORS,
  getRankDisplayText,
} from "./trophies";

// 테마 타입
export type TrophyTheme = "default" | "dark" | "flat" | "nord" | "dracula" | "onedark" | "gruvbox" | "monokai";

// 테마 색상 인터페이스
export interface ThemeColors {
  background: string;
  border: string;
  title: string;
  text: string;
  iconCircle: string;
  laurel: string;
  nextRankBar: string;
  // 랭크별 색상 (SSS~S는 gold계열, A~AA는 silver계열, B~AAA는 bronze계열, C는 기본)
  rankColors: {
    base: string;
    shadow: string;
  };
}

// 랭크별 그라데이션 색상 (원본 github-profile-trophy 스타일)
export const RANK_GRADIENTS: Record<TrophyRank, { base: string; shadow: string; text: string }> = {
  SSS: { base: "#FFD700", shadow: "#FFA500", text: "#FFFFFF" },  // Gold
  SS: { base: "#FFD700", shadow: "#DAA520", text: "#FFFFFF" },   // Gold
  S: { base: "#FFD700", shadow: "#B8860B", text: "#FFFFFF" },    // Gold
  AAA: { base: "#C0C0C0", shadow: "#A9A9A9", text: "#333333" },  // Silver
  AA: { base: "#C0C0C0", shadow: "#808080", text: "#333333" },   // Silver
  A: { base: "#C0C0C0", shadow: "#696969", text: "#333333" },    // Silver
  B: { base: "#CD7F32", shadow: "#8B4513", text: "#FFFFFF" },    // Bronze
  C: { base: "#6A5ACD", shadow: "#483D8B", text: "#FFFFFF" },    // Purple (기본)
  UNKNOWN: { base: "#808080", shadow: "#696969", text: "#FFFFFF" },
};

// 테마 정의 (원본 github-profile-trophy 테마 참고)
export const THEMES: Record<TrophyTheme, ThemeColors> = {
  default: {
    background: "#ffffff",
    border: "#e1e4e8",
    title: "#24292e",
    text: "#586069",
    iconCircle: "#eff1f3",
    laurel: "#9be9a8",
    nextRankBar: "#d1d5da",
    rankColors: { base: "#FFD700", shadow: "#FFA500" },
  },
  dark: {
    background: "#0d1117",
    border: "#30363d",
    title: "#c9d1d9",
    text: "#8b949e",
    iconCircle: "#21262d",
    laurel: "#238636",
    nextRankBar: "#21262d",
    rankColors: { base: "#FFD700", shadow: "#FFA500" },
  },
  flat: {
    background: "#ffffff",
    border: "#dddddd",
    title: "#333333",
    text: "#666666",
    iconCircle: "#f5f5f5",
    laurel: "#4caf50",
    nextRankBar: "#e0e0e0",
    rankColors: { base: "#FFD700", shadow: "#FFA500" },
  },
  nord: {
    background: "#2e3440",
    border: "#4c566a",
    title: "#eceff4",
    text: "#d8dee9",
    iconCircle: "#3b4252",
    laurel: "#a3be8c",
    nextRankBar: "#4c566a",
    rankColors: { base: "#ebcb8b", shadow: "#d08770" },
  },
  dracula: {
    background: "#282a36",
    border: "#44475a",
    title: "#f8f8f2",
    text: "#6272a4",
    iconCircle: "#44475a",
    laurel: "#50fa7b",
    nextRankBar: "#44475a",
    rankColors: { base: "#ffb86c", shadow: "#ff79c6" },
  },
  onedark: {
    background: "#282c34",
    border: "#3e4451",
    title: "#abb2bf",
    text: "#5c6370",
    iconCircle: "#3e4451",
    laurel: "#98c379",
    nextRankBar: "#3e4451",
    rankColors: { base: "#e5c07b", shadow: "#d19a66" },
  },
  gruvbox: {
    background: "#282828",
    border: "#3c3836",
    title: "#ebdbb2",
    text: "#a89984",
    iconCircle: "#3c3836",
    laurel: "#b8bb26",
    nextRankBar: "#504945",
    rankColors: { base: "#fabd2f", shadow: "#d79921" },
  },
  monokai: {
    background: "#272822",
    border: "#49483e",
    title: "#f8f8f2",
    text: "#75715e",
    iconCircle: "#49483e",
    laurel: "#a6e22e",
    nextRankBar: "#49483e",
    rankColors: { base: "#e6db74", shadow: "#f4bf75" },
  },
};

/**
 * 트로피 컵 아이콘 SVG - github-profile-trophy 스타일
 * 트로피 컵 + 손잡이 + 받침대
 */
function getTrophyCupSVG(
  rank: TrophyRank,
  theme: ThemeColors,
  x: number = 0,
  y: number = 0,
  size: number = 60
): string {
  const colors = RANK_GRADIENTS[rank];
  const scale = size / 16; // 기본 viewBox가 16x16 기준

  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <defs>
        <linearGradient id="trophy-fill-${rank}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${colors.base}" />
          <stop offset="100%" stop-color="${colors.shadow}" />
        </linearGradient>
      </defs>
      <!-- 트로피 손잡이 (좌우 원형) -->
      <path
        fill-rule="evenodd"
        d="M12.5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-3 2a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-3 2a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"
        fill="url(#trophy-fill-${rank})"
      />
      <!-- 트로피 컵 본체 -->
      <path
        d="M3 1h10c-.495 3.467-.5 10-5 10S3.495 4.467 3 1z"
        fill="url(#trophy-fill-${rank})"
      />
      <!-- 트로피 받침대 -->
      <path
        d="M3 15a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1H3zm2-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1H5z"
        fill="url(#trophy-fill-${rank})"
      />
      <!-- 트로피 기둥 (컵과 받침대 연결) -->
      <path
        d="M7 10h2v4H7v-4z"
        fill="url(#trophy-fill-${rank})"
      />
      <!-- 트로피 컵 하단 장식 -->
      <path
        d="M10 11c0 .552-.895 1-2 1s-2-.448-2-1 .895-1 2-1 2 .448 2 1z"
        fill="url(#trophy-fill-${rank})"
      />
    </g>
  `;
}

/**
 * 월계관(laurel) 배경 SVG - S랭크 이상에서 표시
 */
function getLaurelSVG(
  theme: ThemeColors,
  x: number,
  y: number,
  size: number = 80
): string {
  const scale = size / 80;
  const laurelColor = theme.laurel;

  return `
    <g transform="translate(${x}, ${y}) scale(${scale})" opacity="0.3">
      <!-- 왼쪽 월계관 -->
      <path
        d="M20 70 Q10 50 20 30 Q15 35 10 50 Q15 65 20 70"
        fill="${laurelColor}"
      />
      <path
        d="M25 65 Q18 50 25 35 Q20 40 18 50 Q20 60 25 65"
        fill="${laurelColor}"
      />
      <path
        d="M30 60 Q25 50 30 40 Q26 44 25 50 Q26 56 30 60"
        fill="${laurelColor}"
      />
      <!-- 오른쪽 월계관 -->
      <path
        d="M60 70 Q70 50 60 30 Q65 35 70 50 Q65 65 60 70"
        fill="${laurelColor}"
      />
      <path
        d="M55 65 Q62 50 55 35 Q60 40 62 50 Q60 60 55 65"
        fill="${laurelColor}"
      />
      <path
        d="M50 60 Q55 50 50 40 Q54 44 55 50 Q54 56 50 60"
        fill="${laurelColor}"
      />
    </g>
  `;
}

/**
 * 랭크 뱃지 SVG
 */
function getRankBadgeSVG(
  rank: TrophyRank,
  x: number,
  y: number
): string {
  const rankText = getRankDisplayText(rank);
  const rankColor = RANK_COLORS[rank];
  const fontSize = rankText.length > 2 ? 9 : 11;
  const badgeWidth = rankText.length > 2 ? 32 : 24;

  return `
    <g transform="translate(${x}, ${y})">
      <rect
        x="0"
        y="0"
        width="${badgeWidth}"
        height="16"
        rx="3"
        fill="${rankColor}"
      />
      <text
        x="${badgeWidth / 2}"
        y="12"
        font-size="${fontSize}"
        font-weight="bold"
        fill="#ffffff"
        text-anchor="middle"
        font-family="Segoe UI, Ubuntu, sans-serif"
      >${rankText}</text>
    </g>
  `;
}

/**
 * 진행률 바 SVG
 */
function getProgressBarSVG(
  progress: number,
  x: number,
  y: number,
  width: number,
  theme: ThemeColors,
  rank: TrophyRank
): string {
  const height = 4;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const fillWidth = (clampedProgress / 100) * width;
  const fillColor = RANK_COLORS[rank];

  return `
    <g transform="translate(${x}, ${y})">
      <rect
        x="0"
        y="0"
        width="${width}"
        height="${height}"
        rx="2"
        fill="${theme.nextRankBar}"
      />
      <rect
        x="0"
        y="0"
        width="${fillWidth}"
        height="${height}"
        rx="2"
        fill="${fillColor}"
      >
        <animate
          attributeName="width"
          from="0"
          to="${fillWidth}"
          dur="0.6s"
          fill="freeze"
        />
      </rect>
    </g>
  `;
}

// 단일 트로피 SVG 옵션
export interface TrophySVGOptions {
  theme?: TrophyTheme;
  width?: number;
  height?: number;
  showProgress?: boolean;
  noFrame?: boolean;
  noBackground?: boolean;
}

/**
 * 단일 트로피 패널 SVG 생성 (github-profile-trophy 스타일)
 */
export function generateSingleTrophySVG(
  trophy: Trophy,
  options: TrophySVGOptions = {}
): string {
  const {
    theme = "default",
    width = 110,
    height = 128,
    showProgress = true,
    noFrame = false,
    noBackground = false,
  } = options;

  const colors = THEMES[theme];
  const padding = 8;
  const contentWidth = width - padding * 2;

  // S랭크 이상이면 월계관 표시
  const showLaurel = ["SSS", "SS", "S"].includes(trophy.rank);

  const backgroundRect = noBackground
    ? ""
    : `<rect
        x="0.5"
        y="0.5"
        width="${width - 1}"
        height="${height - 1}"
        rx="4"
        fill="${colors.background}"
        ${noFrame ? "" : `stroke="${colors.border}" stroke-width="1"`}
      />`;

  // 아이콘 원형 배경
  const iconBgSize = 56;
  const iconBgX = (width - iconBgSize) / 2;
  const iconBgY = padding + 2;

  // 트로피 아이콘 위치
  const trophySize = 40;
  const trophyX = (width - trophySize) / 2;
  const trophyY = iconBgY + 8;

  // 랭크 뱃지 위치
  const rankBadgeWidth = getRankDisplayText(trophy.rank).length > 2 ? 32 : 24;
  const rankBadgeX = (width - rankBadgeWidth) / 2;
  const rankBadgeY = iconBgY + iconBgSize - 8;

  return `
<svg
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  xmlns="http://www.w3.org/2000/svg"
>
  ${backgroundRect}

  ${showLaurel ? getLaurelSVG(colors, (width - 80) / 2, padding - 5, 80) : ""}

  <!-- 아이콘 배경 원 -->
  <circle
    cx="${width / 2}"
    cy="${iconBgY + iconBgSize / 2}"
    r="${iconBgSize / 2}"
    fill="${colors.iconCircle}"
  />

  <!-- 트로피 아이콘 -->
  ${getTrophyCupSVG(trophy.rank, colors, trophyX, trophyY, trophySize)}

  <!-- 랭크 뱃지 -->
  ${getRankBadgeSVG(trophy.rank, rankBadgeX, rankBadgeY)}

  <!-- 트로피 이름 -->
  <text
    x="${width / 2}"
    y="${height - 30}"
    font-size="10"
    font-weight="600"
    fill="${colors.title}"
    text-anchor="middle"
    font-family="Segoe UI, Ubuntu, sans-serif"
  >${trophy.nameKo}</text>

  <!-- 값 표시 -->
  <text
    x="${width / 2}"
    y="${height - 16}"
    font-size="12"
    font-weight="bold"
    fill="${colors.text}"
    text-anchor="middle"
    font-family="Segoe UI, Ubuntu, sans-serif"
  >${trophy.formattedValue}</text>

  <!-- 진행률 바 -->
  ${
    showProgress && trophy.rank !== "SSS"
      ? getProgressBarSVG(
          trophy.progress,
          padding,
          height - padding - 2,
          contentWidth,
          colors,
          trophy.rank
        )
      : ""
  }
</svg>
  `.trim();
}

// 트로피 카드 옵션
export interface TrophyCardOptions extends TrophySVGOptions {
  columns?: number;
  marginX?: number;
  marginY?: number;
  title?: string;
}

/**
 * 전체 트로피 카드 SVG 생성 (여러 트로피를 그리드로 배치)
 */
export function generateTrophyCardSVG(
  trophies: Trophy[],
  options: TrophyCardOptions = {}
): string {
  const {
    theme = "default",
    columns = 4,
    marginX = 5,
    marginY = 5,
    noBackground = false,
    noFrame = false,
    showProgress = true,
    title,
  } = options;

  const colors = THEMES[theme];
  const trophyWidth = 110;
  const trophyHeight = 128;

  // UNKNOWN 랭크 제외
  const validTrophies = trophies.filter((t) => t.rank !== "UNKNOWN");
  if (validTrophies.length === 0) {
    return `<svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
      <text x="100" y="30" text-anchor="middle" fill="${colors.text}" font-family="Segoe UI, sans-serif">No trophies</text>
    </svg>`;
  }

  const rows = Math.ceil(validTrophies.length / columns);
  const actualColumns = Math.min(validTrophies.length, columns);

  const titleHeight = title ? 32 : 0;
  const totalWidth =
    actualColumns * trophyWidth + (actualColumns - 1) * marginX + marginX * 2;
  const totalHeight =
    rows * trophyHeight + (rows - 1) * marginY + marginY * 2 + titleHeight;

  const backgroundRect = noBackground
    ? ""
    : `<rect
        x="0"
        y="0"
        width="${totalWidth}"
        height="${totalHeight}"
        rx="6"
        fill="${colors.background}"
        ${noFrame ? "" : `stroke="${colors.border}" stroke-width="1"`}
      />`;

  const titleText = title
    ? `<text
        x="${totalWidth / 2}"
        y="22"
        font-size="14"
        font-weight="bold"
        fill="${colors.title}"
        text-anchor="middle"
        font-family="Segoe UI, Ubuntu, sans-serif"
      >${title}</text>`
    : "";

  const trophySvgs = validTrophies
    .map((trophy, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = marginX + col * (trophyWidth + marginX);
      const y = marginY + titleHeight + row * (trophyHeight + marginY);

      const singleSvg = generateSingleTrophySVG(trophy, {
        theme,
        width: trophyWidth,
        height: trophyHeight,
        showProgress,
        noFrame: true, // 개별 프레임은 제거 (전체 카드에만 프레임)
        noBackground: true, // 개별 배경도 제거
      });

      // SVG를 그룹으로 감싸서 위치 조정
      const innerContent = singleSvg
        .replace(/<svg[^>]*>/, "")
        .replace(/<\/svg>/, "");
      return `<g transform="translate(${x}, ${y})">${innerContent}</g>`;
    })
    .join("\n");

  return `
<svg
  width="${totalWidth}"
  height="${totalHeight}"
  viewBox="0 0 ${totalWidth} ${totalHeight}"
  xmlns="http://www.w3.org/2000/svg"
>
  ${backgroundRect}
  ${titleText}
  ${trophySvgs}
</svg>
  `.trim();
}

/**
 * 테마 목록 가져오기
 */
export function getAvailableThemes(): TrophyTheme[] {
  return Object.keys(THEMES) as TrophyTheme[];
}

/**
 * 테마 유효성 검사
 */
export function isValidTheme(theme: string): theme is TrophyTheme {
  return theme in THEMES;
}
