"use server";

import prisma from "@/lib/prisma";
import { hasUnmaskPermission } from "@/lib/auth-helpers";

/**
 * slug로 포스트 상세 데이터를 가져오는 Server Action
 * mail-layout 상세 패널에서 사용
 */
export async function getPostDetail(slug: string) {
  const isAuthenticated = await hasUnmaskPermission();

  const post = await prisma.post.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      content: true,
      summary: true,
      slug: true,
      type: true,
      targetDate: true,
      publishedAt: true,
      thumbnailUrl: true,
      contentType: {
        select: {
          slug: true,
          pluralSlug: true,
          displayName: true,
        },
      },
      commits: {
        select: {
          id: true,
          repository: true,
          message: true,
          author: true,
          authorEmail: true,
          authorAvatar: true,
          additions: true,
          deletions: true,
          url: true,
        },
      },
      publishedBy: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  if (!post) return null;

  // 마스킹 적용 (비인증 시)
  if (!isAuthenticated && post.content) {
    // 간단한 마스킹: 비인증 사용자도 상세 패널에서는 content 표시
    // (이미 타임라인 리스트에서 보이는 포스트이므로)
  }

  return {
    ...post,
    targetDate: post.targetDate.toISOString(),
    publishedAt: post.publishedAt?.toISOString() ?? null,
  };
}
