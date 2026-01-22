import prisma from "@/lib/prisma";
import { cache } from "react";

/**
 * pluralSlug로 콘텐츠 타입 조회
 */
export const getContentTypeByPluralSlug = cache(async (pluralSlug: string) => {
  return prisma.contentType.findUnique({
    where: { pluralSlug },
    select: {
      id: true,
      slug: true,
      pluralSlug: true,
      displayName: true,
      description: true,
      isActive: true,
    },
  });
});

/**
 * 콘텐츠 타입별 포스트 목록 조회
 */
export const getPostsByContentType = cache(
  async (
    contentTypeId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ) => {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          contentTypeId,
          status: "PUBLISHED",
        },
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          summary: true,
          slug: true,
          publishedAt: true,
          targetDate: true,
        },
      }),
      prisma.post.count({
        where: {
          contentTypeId,
          status: "PUBLISHED",
        },
      }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
);

/**
 * 콘텐츠 타입과 포스트 slug로 포스트 조회
 */
export const getPostByContentTypeAndSlug = cache(
  async (contentTypeId: string | undefined, postSlug: string) => {
    if (!contentTypeId) return null;

    return prisma.post.findFirst({
      where: {
        contentTypeId,
        slug: postSlug,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        content: true,
        summary: true,
        slug: true,
        publishedAt: true,
        targetDate: true,
        contentType: {
          select: {
            id: true,
            slug: true,
            pluralSlug: true,
            displayName: true,
          },
        },
      },
    });
  }
);

/**
 * 활성화된 모든 콘텐츠 타입 조회 (사이드바, 네비게이션용)
 */
export const getActiveContentTypes = cache(async () => {
  return prisma.contentType.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      slug: true,
      pluralSlug: true,
      displayName: true,
      description: true,
    },
  });
});

/**
 * 모든 활성 콘텐츠 타입의 pluralSlug 목록 (동적 라우트 매칭용)
 */
export const getAllPluralSlugs = cache(async () => {
  const contentTypes = await prisma.contentType.findMany({
    where: { isActive: true },
    select: { pluralSlug: true },
  });
  return contentTypes.map((ct) => ct.pluralSlug);
});
