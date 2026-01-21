import { Suspense } from "react";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { hasUnmaskPermission } from "@/lib/auth-helpers";
import { applyPostListMasking } from "@/lib/masking";
import { getUniqueAuthors } from "@/lib/author-normalizer";
import { TimelineItem } from "@/components/timeline/timeline-item";
import { TimelineSkeleton } from "@/components/timeline/timeline-skeleton";
import { ContentGrid } from "@/components/layout/content-grid";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
} from "@/lib/config";

// 동적 렌더링 강제
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
};

async function Timeline() {
  const isAuthenticated = await hasUnmaskPermission();

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      // COMMIT_BASED는 항상 표시, MANUAL은 showInTimeline=true인 경우만 표시
      OR: [
        { type: "COMMIT_BASED" },
        { type: "MANUAL", showInTimeline: true },
      ],
    },
    orderBy: {
      targetDate: "desc",
    },
    take: 20,
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
        <p className="text-muted-foreground">아직 발행된 글이 없습니다.</p>
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

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
        inLanguage: "ko-KR",
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/opengraph-image`,
        },
        sameAs: [],
      },
      {
        "@type": "Blog",
        "@id": `${SITE_URL}/#blog`,
        url: SITE_URL,
        name: SITE_TITLE,
        description: SITE_DESCRIPTION,
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
        inLanguage: "ko-KR",
      },
    ],
  };

  return (
    <ContentGrid>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<TimelineSkeleton />}>
        <Timeline />
      </Suspense>
    </ContentGrid>
  );
}
