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
import { getContentTypeByPluralSlug } from "@/lib/actions/content-types";
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

interface PluralSlugPageProps {
  params: Promise<{
    pluralSlug: string;
  }>;
}

type PageSource =
  | { type: "contentType"; data: { id: string; displayName: string; description: string | null; pluralSlug: string; hideTimeline: boolean } }
  | { type: "menuItem"; data: { id: string; title: string; postCategory: string } };

async function getPageSource(slug: string): Promise<PageSource | null> {
  // 예약된 경로 체크
  if (RESERVED_ROUTES.includes(slug)) {
    return null;
  }

  // 1. ContentType 먼저 확인
  const contentType = await getContentTypeByPluralSlug(slug);
  if (contentType && contentType.isActive) {
    return {
      type: "contentType",
      data: {
        id: contentType.id,
        displayName: contentType.displayName,
        description: contentType.description,
        pluralSlug: contentType.pluralSlug,
        hideTimeline: contentType.hideTimeline,
      },
    };
  }

  // 2. 기존 SideMenuItem customSlug 확인 (하위 호환)
  const menuItem = await prisma.sideMenuItem.findFirst({
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

  if (menuItem && menuItem.postCategory) {
    return {
      type: "menuItem",
      data: {
        id: menuItem.id,
        title: menuItem.title,
        postCategory: menuItem.postCategory,
      },
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: PluralSlugPageProps): Promise<Metadata> {
  const { pluralSlug } = await params;

  const source = await getPageSource(pluralSlug);

  if (!source) {
    return { title: "페이지를 찾을 수 없습니다" };
  }

  const title = source.type === "contentType"
    ? source.data.displayName
    : source.data.title;

  const description = source.type === "contentType" && source.data.description
    ? source.data.description
    : `${title} 카테고리의 포스트 목록입니다.`;

  return {
    title: `${title} - ${SITE_NAME}`,
    description,
    alternates: {
      canonical: `${SITE_URL}/${pluralSlug}`,
    },
  };
}

async function PostList({
  source,
}: {
  source: PageSource;
}) {
  const isAuthenticated = await hasUnmaskPermission();

  // 쿼리 조건 구성
  const where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    ...(source.type === "contentType"
      ? { contentTypeId: source.data.id }
      : { category: source.data.postCategory }),
  };

  const posts = await prisma.post.findMany({
    where,
    orderBy: {
      targetDate: "desc",
    },
    take: 50,
    include: {
      contentType: {
        select: {
          slug: true,
          pluralSlug: true,
          hideTimeline: true,
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
    },
  });

  const title = source.type === "contentType"
    ? source.data.displayName
    : source.data.title;

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

  // hideTimeline 설정 확인 (contentType에서 또는 source에서)
  const hideTimeline = source.type === "contentType" ? source.data.hideTimeline : false;

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
            thumbnailUrl: post.thumbnailUrl,
            contentType: post.contentType,
          }}
          authors={authors}
          isLatest={index === 0}
          hideTimeline={hideTimeline}
        />
      ))}
    </div>
  );
}

export default async function PluralSlugPage({ params }: PluralSlugPageProps) {
  const { pluralSlug } = await params;

  const source = await getPageSource(pluralSlug);

  if (!source) {
    notFound();
  }

  const title = source.type === "contentType"
    ? source.data.displayName
    : source.data.title;

  const description = source.type === "contentType" && source.data.description
    ? source.data.description
    : `${title} 카테고리의 포스트 목록`;

  return (
    <ContentGrid>
      <div className="pb-4 border-b mb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <Suspense fallback={<TimelineSkeleton />}>
        <PostList source={source} />
      </Suspense>
    </ContentGrid>
  );
}
