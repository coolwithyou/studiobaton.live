/**
 * 트로피 SVG API
 * GET /api/trophy/[githubName]?theme=dark&columns=4&noFrame=false
 *
 * 공개 API - 멤버의 트로피를 SVG 이미지로 반환합니다.
 * README 임베드, 외부 공유 등에 사용할 수 있습니다.
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getMemberProfileStats, getRepoDistribution } from "@/lib/profile-stats";
import { calculateTrophies, TrophyStats } from "@/lib/trophies";
import {
  generateTrophyCardSVG,
  isValidTheme,
  TrophyTheme,
} from "@/lib/trophy-svg";

interface RouteParams {
  params: Promise<{
    githubName: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { githubName } = await params;

  try {
    // 멤버 조회
    const member = await prisma.member.findFirst({
      where: {
        githubName,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        githubName: true,
      },
    });

    if (!member) {
      return new Response(generateErrorSVG("Member not found"), {
        status: 404,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-cache",
        },
      });
    }

    // 프로필 통계 조회
    const stats = await getMemberProfileStats(member.id);

    if (!stats) {
      return new Response(generateErrorSVG("No stats available"), {
        status: 404,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-cache",
        },
      });
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const themeParam = searchParams.get("theme") || "default";
    const columnsParam = searchParams.get("columns");
    const noFrameParam = searchParams.get("noFrame");
    const noBackgroundParam = searchParams.get("noBackground");
    const titleParam = searchParams.get("title");

    // 테마 유효성 검사
    const theme: TrophyTheme = isValidTheme(themeParam) ? themeParam : "default";

    // 컬럼 수 (1-6 범위)
    const columns = columnsParam
      ? Math.min(Math.max(parseInt(columnsParam, 10) || 4, 1), 6)
      : 4;

    // 옵션
    const noFrame = noFrameParam === "true";
    const noBackground = noBackgroundParam === "true";

    // 저장소 수 조회 (트로피 계산에 필요)
    const repos = await getRepoDistribution(member.id);

    // TrophyStats 구성
    const trophyStats: TrophyStats = {
      totalCommits: stats.totalCommits,
      longestStreak: stats.longestStreak,
      activeDays: stats.activeDays,
      totalAdditions: stats.totalAdditions,
      totalDeletions: stats.totalDeletions,
      repositoryCount: repos.length,
    };

    // 트로피 계산
    const trophies = calculateTrophies(trophyStats);

    // SVG 생성
    const svg = generateTrophyCardSVG(trophies, {
      theme,
      columns,
      noFrame,
      noBackground,
      title: titleParam || undefined,
    });

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600", // 1시간 캐시
      },
    });
  } catch (error) {
    console.error("Error generating trophy SVG:", error);
    return new Response(generateErrorSVG("Internal server error"), {
      status: 500,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  }
}

/**
 * 에러 SVG 생성
 */
function generateErrorSVG(message: string): string {
  return `
<svg
  width="400"
  height="80"
  viewBox="0 0 400 80"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect
    x="0.5"
    y="0.5"
    width="399"
    height="79"
    rx="6"
    fill="#1a1b27"
    stroke="#38394e"
    stroke-width="1"
  />
  <text
    x="200"
    y="45"
    font-size="14"
    fill="#ff6b6b"
    text-anchor="middle"
    font-family="Segoe UI, sans-serif"
  >${message}</text>
</svg>
  `.trim();
}
