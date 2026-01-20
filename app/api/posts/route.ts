import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasUnmaskPermission } from "@/lib/auth-helpers";
import { applyPostListMasking } from "@/lib/masking";
import { createCacheHeaders, CACHE_TTL } from "@/lib/cache";
import { paginationSchema, postTypeSchema } from "@/lib/validation";
import { logError, normalizeError } from "@/lib/errors";
import { Prisma } from "@/app/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await hasUnmaskPermission();
    const { searchParams } = new URL(request.url);

    // 입력 검증
    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    const skip = (page - 1) * limit;

    // 선택적 필터
    const category = searchParams.get("category");
    const typeParam = searchParams.get("type");
    const type = typeParam ? postTypeSchema.parse(typeParam) : undefined;

    // 필터 조건 구성
    const where: Prisma.PostWhereInput = {
      status: "PUBLISHED",
      ...(category && { category }),
      ...(type && { type }),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: {
          targetDate: "desc",
        },
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
      prisma.post.count({ where }),
    ]);

    // 마스킹 적용
    const maskedPosts = await applyPostListMasking(
      posts.map((post) => ({
        ...post,
        commits: post.commits.map((c) => ({ ...c })),
      })),
      isAuthenticated
    );

    // 캐시 헤더 설정 (비인증 사용자에게만 캐싱)
    const cacheHeaders = isAuthenticated
      ? createCacheHeaders(0, { noStore: true })
      : createCacheHeaders(CACHE_TTL.MEDIUM, {
          public: true,
          staleWhileRevalidate: CACHE_TTL.LONG,
        });

    return NextResponse.json(
      {
        posts: maskedPosts,
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
    logError("Fetch posts", error);
    const apiError = normalizeError(error);
    return NextResponse.json(apiError.toJSON(), { status: apiError.status });
  }
}
