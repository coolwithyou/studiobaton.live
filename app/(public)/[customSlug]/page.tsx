import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { hasUnmaskPermission } from "@/lib/auth-helpers";
import { applyPostListMasking } from "@/lib/masking";
import { getUniqueAuthors } from "@/lib/author-normalizer";
import { TimelineItem } from "@/components/timeline/timeline-item";
import { TimelineSkeleton } from "@/components/timeline/timeline-skeleton";
import { ContentGrid } from "@/components/layout/content-grid";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { Prisma } from "@/app/generated/prisma";

// 동적 렌더링 강제
export const dynamic = "force-dynamic";

// 예약된 경로 (정적 라우트와 충돌 방지)
const RESERVED_ROUTES = [
  "posts",
  "post",
  "log",
  "members",
  "member",
  "api",
  "console",
];

interface CustomSlugPageProps {
  params: Promise<{
    customSlug: string;
  }>;
}

async function getMenuItemBySlug(slug: string) {
  // 예약된 경로 체크
  if (RESERVED_ROUTES.includes(slug)) {
    return null;
  }

  return prisma.sideMenuItem.findFirst({
    where: {
      customSlug: slug,
      isActive: true,
      linkType: "POST_CATEGORY",
    },
    select: {
      id: true,
      title: true,
      postCategory: true,
    },
  });
}

export async function generateMetadata({
  params,
}: CustomSlugPageProps): Promise<Metadata> {
  const { customSlug } = await params;

  const menuItem = await getMenuItemBySlug(customSlug);

  if (!menuItem) {
    return { title: "페이지를 찾을 수 없습니다" };
  }

  return {
    title: `${menuItem.title} - ${SITE_NAME}`,
    description: `${menuItem.title} 카테고리의 포스트 목록입니다.`,
    alternates: {
      canonical: `${SITE_URL}/${customSlug}`,
    },
  };
}

async function PostList({ category, title }: { category: string; title: string }) {
  const isAuthenticated = await hasUnmaskPermission();

  const where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    category,
  };

  const posts = await prisma.post.findMany({
    where,
    orderBy: {
      targetDate: "desc",
    },
    take: 50,
    include: {
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
    },
  });

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">
          &apos;{title}&apos; 카테고리에 발행된 포스트가 없습니다.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          곧 새로운 이야기로 찾아뵙겠습니다.
        </p>
      </div>
    );
  }

  // 마스킹 적용
  const maskedPosts = await applyPostListMasking(
    posts.map((post) => ({
      ...post,
      commits: post.commits.map((c) => ({ ...c, url: c.url })),
    })),
    isAuthenticated
  );

  // 각 포스트에 대해 정규화된 저자 목록 계산
  const postsWithAuthors = await Promise.all(
    maskedPosts.map(async (post, index) => {
      const authors = await getUniqueAuthors(
        posts[index].commits.map((c) => ({
          author: c.author,
          authorEmail: c.authorEmail,
          authorAvatar: c.authorAvatar,
        }))
      );
      return { post, authors };
    })
  );

  return (
    <div className="py-8">
      {postsWithAuthors.map(({ post, authors }, index) => (
        <TimelineItem
          key={post.id}
          post={{
            id: post.id,
            slug: post.slug!,
            title: post.title!,
            content: post.content!,
            summary: post.summary,
            targetDate: post.targetDate.toISOString(),
            publishedAt: post.publishedAt?.toISOString() || null,
            commits: post.commits,
            type: post.type,
          }}
          authors={authors}
          isLatest={index === 0}
        />
      ))}
    </div>
  );
}

export default async function CustomSlugPage({ params }: CustomSlugPageProps) {
  const { customSlug } = await params;

  const menuItem = await getMenuItemBySlug(customSlug);

  if (!menuItem || !menuItem.postCategory) {
    notFound();
  }

  return (
    <ContentGrid>
      <div className="pb-4 border-b mb-4">
        <h1 className="text-2xl font-bold">{menuItem.title}</h1>
        <p className="text-muted-foreground mt-1">
          {menuItem.title} 카테고리의 포스트 목록
        </p>
      </div>
      <Suspense fallback={<TimelineSkeleton />}>
        <PostList category={menuItem.postCategory} title={menuItem.title} />
      </Suspense>
    </ContentGrid>
  );
}
