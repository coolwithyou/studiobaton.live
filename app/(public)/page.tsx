import { Suspense } from "react";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { hasUnmaskPermission } from "@/lib/auth-helpers";
import { applyPostListMasking } from "@/lib/masking";
import { MailLayout } from "@/components/mail-layout/mail-layout";
import { TimelineSkeleton } from "@/components/timeline/timeline-skeleton";
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

async function TimelinePosts() {
  const isAuthenticated = await hasUnmaskPermission();

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
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
      contentType: {
        select: {
          slug: true,
          pluralSlug: true,
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

  // 마스킹 적용
  const maskedPosts = await applyPostListMasking(
    posts.map((post) => ({
      ...post,
      commits: post.commits.map((c) => ({ ...c, url: c.url })),
    })),
    isAuthenticated
  );

  // MailLayout에 전달할 경량 데이터
  const postsForList = maskedPosts.map((post) => ({
    id: post.id,
    slug: post.slug!,
    title: post.title!,
    summary: post.summary,
    content: post.content!,
    targetDate: post.targetDate.toISOString(),
    type: post.type as "COMMIT_BASED" | "MANUAL",
    contentType: post.contentType,
    commits: post.commits.map((c) => ({
      id: c.id,
      repository: c.repository,
      author: c.author,
      authorAvatar: c.authorAvatar,
      additions: c.additions,
      deletions: c.deletions,
    })),
  }));

  return <MailLayout posts={postsForList} />;
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<TimelineSkeleton />}>
        <TimelinePosts />
      </Suspense>
    </>
  );
}
