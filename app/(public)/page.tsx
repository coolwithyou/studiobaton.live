import { Suspense } from "react";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { hasUnmaskPermission } from "@/lib/auth-helpers";
import { applyPostListMasking } from "@/lib/masking";
import { TimelineItem } from "@/components/timeline/timeline-item";
import { TimelineSkeleton } from "@/components/timeline/timeline-skeleton";

// 동적 렌더링 강제
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "studiobaton - 개발 이야기",
  description:
    "studiobaton 개발팀의 일상과 기술 이야기. 매일 자동으로 생성되는 개발 블로그입니다.",
  alternates: {
    canonical: "https://log.ba-ton.kr",
  },
};

async function Timeline() {
  const isAuthenticated = await hasUnmaskPermission();

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
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

  return (
    <div className="py-8">
      {maskedPosts.map((post, index) => (
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
        "@id": "https://log.ba-ton.kr/#website",
        url: "https://log.ba-ton.kr",
        name: "studiobaton",
        description:
          "studiobaton 개발팀의 일상과 기술 이야기. 매일 자동으로 생성되는 개발 블로그입니다.",
        publisher: {
          "@id": "https://log.ba-ton.kr/#organization",
        },
        inLanguage: "ko-KR",
      },
      {
        "@type": "Organization",
        "@id": "https://log.ba-ton.kr/#organization",
        name: "studiobaton",
        url: "https://log.ba-ton.kr",
        logo: {
          "@type": "ImageObject",
          url: "https://log.ba-ton.kr/opengraph-image",
        },
        sameAs: [],
      },
      {
        "@type": "Blog",
        "@id": "https://log.ba-ton.kr/#blog",
        url: "https://log.ba-ton.kr",
        name: "studiobaton - 개발 이야기",
        description:
          "studiobaton 개발팀의 일상과 기술 이야기. 매일 자동으로 생성되는 개발 블로그입니다.",
        publisher: {
          "@id": "https://log.ba-ton.kr/#organization",
        },
        inLanguage: "ko-KR",
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 max-w-2xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<TimelineSkeleton />}>
        <Timeline />
      </Suspense>
    </div>
  );
}
