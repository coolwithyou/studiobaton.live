import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import { GIPHY_API_KEY } from "@/lib/config";
import {
  logError,
  normalizeError,
  AuthError,
  ForbiddenError,
} from "@/lib/errors";
import type { GiphySearchResponse } from "@/types/giphy";

const GIPHY_SEARCH_URL = "https://api.giphy.com/v1/gifs/search";
const GIPHY_TRENDING_URL = "https://api.giphy.com/v1/gifs/trending";

/**
 * GET /api/giphy/search?q={query}&limit={limit}&offset={offset}
 * GIPHY GIF 검색 API
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("GIF 검색 권한이 없습니다.");
    }

    if (!GIPHY_API_KEY) {
      return NextResponse.json(
        { error: "GIPHY API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    // 검색어가 있으면 search, 없으면 trending
    const endpoint = q.trim() ? GIPHY_SEARCH_URL : GIPHY_TRENDING_URL;

    const giphyUrl = new URL(endpoint);
    giphyUrl.searchParams.set("api_key", GIPHY_API_KEY);
    giphyUrl.searchParams.set("limit", limit.toString());
    giphyUrl.searchParams.set("offset", offset.toString());
    giphyUrl.searchParams.set("rating", "g"); // 전체 이용가
    giphyUrl.searchParams.set("lang", "ko");

    if (q.trim()) {
      giphyUrl.searchParams.set("q", q.trim());
    }

    const response = await fetch(giphyUrl.toString(), {
      next: { revalidate: 60 }, // 1분 캐시
    });

    if (!response.ok) {
      throw new Error(`GIPHY API 오류: ${response.status}`);
    }

    const data: GiphySearchResponse = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    logError("GET /api/giphy/search", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
