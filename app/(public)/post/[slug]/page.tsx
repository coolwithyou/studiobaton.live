import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { hasUnmaskPermission } from "@/lib/auth-helpers";
import { formatKST } from "@/lib/date-utils";
import { PostAuthorSection } from "@/components/post/post-author-section";
import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { ContentGrid } from "@/components/layout/content-grid";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { stripMarkdown } from "@/lib/strip-markdown";
import { extractHeadings } from "@/lib/extract-headings";
import { TableOfContents } from "@/components/toc/table-of-contents";
import { MobileToc } from "@/components/toc/mobile-toc";

// 동적 렌더링 강제
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      title: true,
      summary: true,
      content: true,
      type: true,
      targetDate: true,
      publishedAt: true,
      contentType: {
        select: {
          pluralSlug: true,
        },
      },
    },
  });

  // COMMIT_BASED는 /log에서 처리, ContentType이 있는 포스트는 해당 경로로
  if (!post || post.type === "COMMIT_BASED" || post.contentType?.pluralSlug) {
    return {
      title: "포스트를 찾을 수 없습니다",
    };
  }

  const rawDescription = post.summary || post.content || "";
  const description = stripMarkdown(rawDescription).slice(0, 160);

  return {
    title: `${post.title} | ${SITE_NAME}`,
    description,
    openGraph: {
      title: post.title || SITE_NAME,
      description,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title || SITE_NAME,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/post/${slug}`,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const isAuthenticated = await hasUnmaskPermission();

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      contentType: {
        select: {
          slug: true,
          pluralSlug: true,
        },
      },
      publishedBy: {
        select: {
          name: true,
          linkedMember: {
            select: {
              id: true,
              name: true,
              githubName: true,
              avatarUrl: true,
              profileImageUrl: true,
              bio: true,
              title: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!post || post.status !== "PUBLISHED") {
    notFound();
  }

  // COMMIT_BASED 타입은 /log로 리다이렉트 (301 Permanent)
  if (post.type === "COMMIT_BASED") {
    redirect(`/log/${slug}`);
  }

  // ContentType이 있는 포스트는 해당 타입의 URL로 리다이렉트
  if (post.contentType?.pluralSlug) {
    redirect(`/${post.contentType.pluralSlug}/${slug}`);
  }

  // 마크다운에서 헤딩 추출 (TOC용)
  const headings = extractHeadings(post.content || "");

  return (
    <ContentGrid
      aside={headings.length > 0 ? <TableOfContents headings={headings} /> : undefined}
      mobileToc={headings.length > 0 ? <MobileToc headings={headings} /> : undefined}
    >
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← 타임라인으로
      </Link>
      <article>
        <header className="mb-8">
          <time className="text-sm text-muted-foreground">
            {formatKST(post.targetDate, "yyyy년 M월 d일 (EEEE)")}
          </time>
          <h1 className="text-xl md:text-2xl font-bold mt-2">{post.title}</h1>
        </header>
        <Suspense
          fallback={<div className="animate-pulse h-96 bg-muted/30 rounded-lg" />}
        >
          <MarkdownRenderer
            content={post.content || ""}
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:my-1"
          />
        </Suspense>

        {/* 작성자 정보 섹션 */}
        <PostAuthorSection
          postAuthor={post.publishedBy?.linkedMember || null}
          contributors={[]}
        />

        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground text-center mt-8 border-t pt-6">
            개발자 개인정보 및 고객사 정보 보호를 위해 프로젝트명과 일부 세부
            정보는 마스킹 처리되어 있습니다.
          </p>
        )}
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.summary || post.content?.slice(0, 160),
            datePublished: post.publishedAt?.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            author: post.publishedBy?.linkedMember
              ? {
                  "@type": "Person",
                  name: post.publishedBy.linkedMember.name,
                }
              : undefined,
            publisher: {
              "@type": "Organization",
              name: "studiobaton",
            },
          }),
        }}
      />
    </ContentGrid>
  );
}
