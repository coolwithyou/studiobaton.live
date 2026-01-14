import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isInternalUser } from "@/lib/auth-helpers";
import { applyPostListMasking } from "@/lib/masking";
import { searchSchema, formatZodError } from "@/lib/validation";
import { logError, normalizeError, ValidationError } from "@/lib/errors";
import { createCacheHeaders, CACHE_TTL } from "@/lib/cache";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await isInternalUser();
    const { searchParams } = new URL(request.url);

    // 입력 검증
    let params;
    try {
      params = searchSchema.parse({
        query: searchParams.get("query") || "",
        page: searchParams.get("page"),
        limit: searchParams.get("limit"),
        status: searchParams.get("status"),
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          "검색 파라미터가 올바르지 않습니다.",
          formatZodError(error)
        );
      }
      throw error;
    }

    const { query, page, limit, status, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    // 검색 조건 구성
    const whereCondition: Record<string, unknown> = {
      status: status || "PUBLISHED",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
      ],
    };

    // 날짜 범위 필터
    if (startDate || endDate) {
      whereCondition.targetDate = {};
      if (startDate) {
        (whereCondition.targetDate as Record<string, Date>).gte = startDate;
      }
      if (endDate) {
        (whereCondition.targetDate as Record<string, Date>).lte = endDate;
      }
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: whereCondition,
        orderBy: { targetDate: "desc" },
        skip,
        take: limit,
        include: {
          commits: {
            select: {
              id: true,
              repository: true,
              message: true,
              author: true,
              authorAvatar: true,
              additions: true,
              deletions: true,
              url: true,
            },
          },
        },
      }),
      prisma.post.count({ where: whereCondition }),
    ]);

    // 마스킹 적용
    const maskedPosts = await applyPostListMasking(
      posts.map((post) => ({
        ...post,
        commits: post.commits.map((c) => ({ ...c })),
      })),
      isAuthenticated
    );

    // 검색어 하이라이팅 (제목, 요약에만 적용)
    const highlightedPosts = maskedPosts.map((post) => ({
      ...post,
      titleHighlighted: highlightText(post.title || "", query),
      summaryHighlighted: highlightText(post.summary || "", query),
    }));

    // 캐시 헤더 설정 (짧은 캐시)
    const cacheHeaders = isAuthenticated
      ? createCacheHeaders(0, { noStore: true })
      : createCacheHeaders(CACHE_TTL.SHORT, {
          public: true,
          staleWhileRevalidate: CACHE_TTL.MEDIUM,
        });

    return NextResponse.json(
      {
        posts: highlightedPosts,
        query,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: cacheHeaders }
    );
  } catch (error) {
    logError("Search posts", error);
    const apiError = normalizeError(error);
    return NextResponse.json(apiError.toJSON(), { status: apiError.status });
  }
}

/**
 * 검색어 하이라이팅 (간단한 버전)
 */
function highlightText(text: string, query: string): string {
  if (!query || !text) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  return text.replace(regex, "<mark>$1</mark>");
}
