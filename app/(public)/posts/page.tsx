import { Suspense } from "react";
import type { Metadata } from "next";
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

interface PostsPageProps {
  searchParams: Promise<{
    category?: string;
    type?: string;
    page?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: PostsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = params.category;

  const title = category
    ? `${category} - ${SITE_NAME}`
    : `포스트 - ${SITE_NAME}`;
  const description = category
    ? `${category} 카테고리의 포스트 목록입니다.`
    : "스튜디오 바톤 개발팀의 포스트 목록입니다.";

  return {
    title,
    description,
    alternates: {
      canonical: category
        ? `${SITE_URL}/posts?category=${encodeURIComponent(category)}`
        : `${SITE_URL}/posts`,
    },
  };
}

async function PostList({
  category,
  type,
}: {
  category?: string;
  type?: string;
}) {
  const isAuthenticated = await hasUnmaskPermission();

  // 필터 조건 구성
  const where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    ...(category && { category }),
    ...(type && { type: type as "COMMIT_BASED" | "MANUAL" }),
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
          {category
            ? `'${category}' 카테고리에 발행된 포스트가 없습니다.`
            : "아직 발행된 포스트가 없습니다."}
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
          }}
          authors={authors}
          isLatest={index === 0}
        />
      ))}
    </div>
  );
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const category = params.category;
  const type = params.type;

  return (
    <ContentGrid>
      {category && (
        <div className="pb-4 border-b mb-4">
          <h1 className="text-2xl font-bold">{category}</h1>
          <p className="text-muted-foreground mt-1">
            {category} 카테고리의 포스트 목록
          </p>
        </div>
      )}
      <Suspense fallback={<TimelineSkeleton />}>
        <PostList category={category} type={type} />
      </Suspense>
    </ContentGrid>
  );
}
