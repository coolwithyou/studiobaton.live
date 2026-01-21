/**
 * 트로피 SVG 생성 유틸리티
 * github-profile-trophy 스타일의 SVG 트로피 카드 생성
 */

import {
  Trophy,
  TrophyRank,
  RANK_COLORS,
  RANK_GRADIENTS,
  getRankDisplayText,
} from "./trophies";

// 테마 타입
export type TrophyTheme = "default" | "dark" | "flat" | "nord" | "dracula";

// 테마 색상 인터페이스
export interface ThemeColors {
  background: string;
  border: string;
  title: string;
  subtitle: string;
  text: string;
  progressBg: string;
  progressFill: string;
}

// 테마 정의
export const THEMES: Record<TrophyTheme, ThemeColors> = {
  default: {
    background: "#ffffff",
    border: "#e4e2e2",
    title: "#333333",
    subtitle: "#666666",
    text: "#333333",
    progressBg: "#e0e0e0",
    progressFill: "#4caf50",
  },
  dark: {
    background: "#1a1b27",
    border: "#38394e",
    title: "#ffffff",
    subtitle: "#a9a9a9",
    text: "#ffffff",
    progressBg: "#38394e",
    progressFill: "#58a6ff",
  },
  flat: {
    background: "#f5f5f5",
    border: "#dddddd",
    title: "#333333",
    subtitle: "#666666",
    text: "#333333",
    progressBg: "#dddddd",
    progressFill: "#4caf50",
  },
  nord: {
    background: "#2e3440",
    border: "#4c566a",
    title: "#eceff4",
    subtitle: "#d8dee9",
    text: "#eceff4",
    progressBg: "#4c566a",
    progressFill: "#88c0d0",
  },
  dracula: {
    background: "#282a36",
    border: "#44475a",
    title: "#f8f8f2",
    subtitle: "#bd93f9",
    text: "#f8f8f2",
    progressBg: "#44475a",
    progressFill: "#50fa7b",
  },
};

// 트로피 아이콘 SVG (심플한 트로피 모양)
function getTrophyIconSVG(rank: TrophyRank, size: number = 40): string {
  const colors = RANK_GRADIENTS[rank];
  const iconSize = size;

  return `
    <svg x="0" y="0" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="trophy-grad-${rank}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.end};stop-opacity:1" />
        </linearGradient>
      </defs>
      <path
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill="url(#trophy-grad-${rank})"
      />
    </svg>
  `;
}

// 랭크 뱃지 SVG
function getRankBadgeSVG(
  rank: TrophyRank,
  x: number,
  y: number,
  theme: ThemeColors
): string {
  const rankText = getRankDisplayText(rank);
  const rankColor = RANK_COLORS[rank];
  const fontSize = rankText.length > 2 ? 10 : 12;

  return `
    <g transform="translate(${x}, ${y})">
      <rect
        x="0"
        y="0"
        width="36"
        height="18"
        rx="4"
        fill="${rankColor}"
      />
      <text
        x="18"
        y="13"
        font-size="${fontSize}"
        font-weight="bold"
        fill="#ffffff"
        text-anchor="middle"
        font-family="Segoe UI, sans-serif"
      >${rankText}</text>
    </g>
  `;
}

// 진행률 바 SVG
function getProgressBarSVG(
  progress: number,
  x: number,
  y: number,
  width: number,
  theme: ThemeColors,
  rank: TrophyRank
): string {
  const height = 6;
  const fillWidth = (progress / 100) * width;
  const fillColor = progress >= 100 ? RANK_COLORS[rank] : theme.progressFill;

  return `
    <g transform="translate(${x}, ${y})">
      <rect
        x="0"
        y="0"
        width="${width}"
        height="${height}"
        rx="3"
        fill="${theme.progressBg}"
      />
      <rect
        x="0"
        y="0"
        width="${fillWidth}"
        height="${height}"
        rx="3"
        fill="${fillColor}"
      >
        <animate
          attributeName="width"
          from="0"
          to="${fillWidth}"
          dur="0.5s"
          fill="freeze"
        />
      </rect>
      <text
        x="${width + 8}"
        y="5"
        font-size="9"
        fill="${theme.subtitle}"
        font-family="Segoe UI, sans-serif"
      >${progress}%</text>
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
}

/**
 * 단일 트로피 SVG 생성
 */
export function generateSingleTrophySVG(
  trophy: Trophy,
  options: TrophySVGOptions = {}
): string {
  const {
    theme = "default",
    width = 120,
    height = 140,
    showProgress = true,
    noFrame = false,
  } = options;

  const colors = THEMES[theme];
  const padding = 12;
  const contentWidth = width - padding * 2;

  const borderStyle = noFrame
    ? ""
    : `stroke="${colors.border}" stroke-width="1"`;

  return `
<svg
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect
    x="0.5"
    y="0.5"
    width="${width - 1}"
    height="${height - 1}"
    rx="6"
    fill="${colors.background}"
    ${borderStyle}
  />

  <!-- Trophy Icon -->
  <g transform="translate(${width / 2 - 20}, ${padding})">
    ${getTrophyIconSVG(trophy.rank, 40)}
  </g>

  <!-- Title -->
  <text
    x="${width / 2}"
    y="${padding + 52}"
    font-size="11"
    font-weight="600"
    fill="${colors.title}"
    text-anchor="middle"
    font-family="Segoe UI, sans-serif"
  >${trophy.name}</text>

  <!-- Rank Badge -->
  ${getRankBadgeSVG(trophy.rank, width / 2 - 18, padding + 60, colors)}

  <!-- Value -->
  <text
    x="${width / 2}"
    y="${padding + 95}"
    font-size="14"
    font-weight="bold"
    fill="${colors.text}"
    text-anchor="middle"
    font-family="Segoe UI, sans-serif"
  >${trophy.formattedValue}</text>

  <!-- Progress Bar -->
  ${
    showProgress && trophy.rank !== "SSS"
      ? getProgressBarSVG(trophy.progress, padding, height - padding - 10, contentWidth - 30, colors, trophy.rank)
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
  noBackground?: boolean;
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
    marginX = 8,
    marginY = 8,
    noBackground = false,
    noFrame = false,
    showProgress = true,
    title,
  } = options;

  const colors = THEMES[theme];
  const trophyWidth = 120;
  const trophyHeight = 140;

  const rows = Math.ceil(trophies.length / columns);
  const actualColumns = Math.min(trophies.length, columns);

  const titleHeight = title ? 40 : 0;
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
        rx="8"
        fill="${colors.background}"
        ${noFrame ? "" : `stroke="${colors.border}" stroke-width="1"`}
      />`;

  const titleText = title
    ? `<text
        x="${totalWidth / 2}"
        y="28"
        font-size="16"
        font-weight="bold"
        fill="${colors.title}"
        text-anchor="middle"
        font-family="Segoe UI, sans-serif"
      >${title}</text>`
    : "";

  const trophySvgs = trophies
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
        noFrame,
      });

      // SVG를 그룹으로 감싸서 위치 조정
      return `<g transform="translate(${x}, ${y})">${singleSvg.replace(/<\/?svg[^>]*>/g, "")}</g>`;
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
