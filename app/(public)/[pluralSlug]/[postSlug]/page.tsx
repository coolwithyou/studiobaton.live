import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { hasUnmaskPermission } from "@/lib/auth-helpers";
import { applyPostMaskingAsync } from "@/lib/masking";
import { formatKST } from "@/lib/date-utils";
import { getUniqueAuthors, getContributorsWithStats } from "@/lib/author-normalizer";
import { PostAuthorSection } from "@/components/post/post-author-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { ContentGrid } from "@/components/layout/content-grid";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { stripMarkdown } from "@/lib/strip-markdown";
import { extractHeadings } from "@/lib/extract-headings";
import { TableOfContents } from "@/components/toc/table-of-contents";
import {
  getContentTypeByPluralSlug,
  getPostByContentTypeAndSlug,
} from "@/lib/actions/content-types";

// 동적 렌더링 강제
export const dynamic = "force-dynamic";

// 예약된 경로
const RESERVED_ROUTES = [
  "posts",
  "post",
  "log",
  "members",
  "member",
  "api",
  "console",
];

interface PageProps {
  params: Promise<{ pluralSlug: string; postSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pluralSlug, postSlug } = await params;

  // 예약된 경로는 404
  if (RESERVED_ROUTES.includes(pluralSlug)) {
    return { title: "페이지를 찾을 수 없습니다" };
  }

  const contentType = await getContentTypeByPluralSlug(pluralSlug);
  if (!contentType || !contentType.isActive) {
    return { title: "페이지를 찾을 수 없습니다" };
  }

  const post = await getPostByContentTypeAndSlug(contentType.id, postSlug);
  if (!post) {
    return { title: "포스트를 찾을 수 없습니다" };
  }

  const rawDescription = post.summary || post.content || "";
  const description = stripMarkdown(rawDescription).slice(0, 160);

  return {
    title: `${post.title} | ${contentType.displayName} | ${SITE_NAME}`,
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
      canonical: `${SITE_URL}/${pluralSlug}/${postSlug}`,
    },
  };
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { pluralSlug, postSlug } = await params;

  // 예약된 경로는 404
  if (RESERVED_ROUTES.includes(pluralSlug)) {
    notFound();
  }

  const contentType = await getContentTypeByPluralSlug(pluralSlug);
  if (!contentType || !contentType.isActive) {
    notFound();
  }

  const isAuthenticated = await hasUnmaskPermission();

  // 전체 포스트 정보 조회
  const post = await prisma.post.findFirst({
    where: {
      contentTypeId: contentType.id,
      slug: postSlug,
      status: "PUBLISHED",
    },
    include: {
      commits: {
        orderBy: {
          committedAt: "asc",
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

  if (!post) {
    notFound();
  }

  // 마크다운에서 헤딩 추출 (TOC용)
  const headings = extractHeadings(post.content || "");

  // COMMIT_BASED 포스트는 커밋 정보와 함께 표시
  if (post.type === "COMMIT_BASED" && post.commits.length > 0) {
    // 마스킹 적용
    const maskedPost = await applyPostMaskingAsync(
      {
        ...post,
        commits: post.commits.map((c) => ({
          id: c.id,
          repository: c.repository,
          message: c.message,
          author: c.author,
          authorEmail: c.authorEmail,
          authorAvatar: c.authorAvatar,
          additions: c.additions,
          deletions: c.deletions,
          url: c.url,
          committedAt: c.committedAt,
        })),
      },
      isAuthenticated
    );

    // 고유한 저자 목록
    const authors = await getUniqueAuthors(
      maskedPost.commits.map((c) => ({
        author: c.author,
        authorEmail: c.authorEmail,
        authorAvatar: c.authorAvatar,
        additions: c.additions,
        deletions: c.deletions,
      }))
    );

    // 커밋 참여자 통계
    const contributorsWithStats = await getContributorsWithStats(
      maskedPost.commits.map((c) => ({
        author: c.author,
        authorEmail: c.authorEmail,
        authorAvatar: c.authorAvatar,
        additions: c.additions,
        deletions: c.deletions,
      }))
    );

    // 커밋별 아바타 매핑
    const authorAvatarMap = new Map<string, string | null>();
    for (const author of authors) {
      for (const originalAuthor of author.originalAuthors) {
        authorAvatarMap.set(originalAuthor, author.avatar);
      }
    }

    // 레포지토리별 통계
    const repoStats = maskedPost.commits.reduce((acc, commit) => {
      if (!acc[commit.repository]) {
        acc[commit.repository] = { commits: 0, additions: 0, deletions: 0 };
      }
      acc[commit.repository].commits++;
      acc[commit.repository].additions += commit.additions;
      acc[commit.repository].deletions += commit.deletions;
      return acc;
    }, {} as Record<string, { commits: number; additions: number; deletions: number }>);

    return (
      <ContentGrid
        aside={headings.length > 0 ? <TableOfContents headings={headings} /> : undefined}
      >
        <Link
          href={`/${contentType.pluralSlug}`}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
        >
          ← {contentType.displayName} 목록으로
        </Link>
        <article>
          <header className="mb-8">
            <time className="text-sm text-muted-foreground">
              {formatKST(post.targetDate, "yyyy년 M월 d일 (EEEE)")}
            </time>
            <h1 className="text-2xl font-bold mt-2">{post.title}</h1>

            <div className="flex items-center gap-3 mt-4">
              <div className="flex -space-x-2">
                {authors.slice(0, 5).map((author, i) =>
                  author.githubName ? (
                    <Link
                      key={i}
                      href={`/member/${author.githubName}`}
                      className="hover:z-10 transition-transform hover:scale-110"
                    >
                      <Avatar className="w-8 h-8 border-2 border-background">
                        <AvatarImage src={author.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {author.name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Avatar key={i} className="w-8 h-8 border-2 border-background">
                      <AvatarImage src={author.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {author.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {authors.map((a, i) =>
                  a.githubName ? (
                    <Link
                      key={i}
                      href={`/member/${a.githubName}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {a.name}
                      {i < authors.length - 1 && ", "}
                    </Link>
                  ) : (
                    <span key={i}>
                      {a.name}
                      {i < authors.length - 1 && ", "}
                    </span>
                  )
                )}
              </span>
            </div>
          </header>
          <Suspense
            fallback={<div className="animate-pulse h-96 bg-muted/30 rounded-lg" />}
          >
            <MarkdownRenderer
              content={maskedPost.content || ""}
              className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:my-1"
            />
          </Suspense>

          {/* 작성자 정보 섹션 */}
          <PostAuthorSection
            postAuthor={post.publishedBy?.linkedMember || null}
            contributors={contributorsWithStats}
          />

          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              개발자 개인정보 및 고객사 정보 보호를 위해 프로젝트명과 일부 세부
              정보는 마스킹 처리되어 있습니다.
            </p>
          )}

          {maskedPost.commits.length > 0 && (
            <>
              <Separator className="my-8" />
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4">작업한 프로젝트</h2>
                <div className="grid gap-3">
                  {Object.entries(repoStats).map(([repo, stats]) => (
                    <div
                      key={repo}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="font-medium">{repo}</span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{stats.commits}개 커밋</span>
                        <span className="text-green-600">+{stats.additions}</span>
                        <span className="text-red-600">-{stats.deletions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h2 className="text-lg font-semibold mb-4">상세 커밋 내역</h2>
                <div className="space-y-2">
                  {maskedPost.commits.map((commit) => {
                    const CommitWrapper = commit.url ? "a" : "div";
                    const wrapperProps = commit.url
                      ? {
                          href: commit.url,
                          target: "_blank",
                          rel: "noopener noreferrer",
                        }
                      : {};

                    return (
                      <CommitWrapper
                        key={commit.id}
                        {...wrapperProps}
                        className={`block p-3 rounded-lg transition-colors ${
                          commit.url
                            ? "hover:bg-muted/50 group cursor-pointer"
                            : "bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-6 h-6 mt-0.5">
                            <AvatarImage
                              src={
                                authorAvatarMap.get(commit.author) ||
                                commit.authorAvatar ||
                                undefined
                              }
                            />
                            <AvatarFallback className="text-xs">
                              {commit.author.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-mono truncate transition-colors ${
                                commit.url ? "group-hover:text-primary" : ""
                              }`}
                            >
                              {commit.message.split("\n")[0]}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {commit.repository} · {commit.author} ·{" "}
                              <span className="text-green-600">
                                +{commit.additions}
                              </span>
                              {" / "}
                              <span className="text-red-600">
                                -{commit.deletions}
                              </span>
                            </p>
                          </div>
                        </div>
                      </CommitWrapper>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </article>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: maskedPost.summary || maskedPost.content?.slice(0, 160),
              datePublished: post.publishedAt?.toISOString(),
              dateModified: post.updatedAt.toISOString(),
              author: authors.map((a) => ({
                "@type": "Person",
                name: a.name,
              })),
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

  // MANUAL 포스트 또는 커밋 없는 포스트
  return (
    <ContentGrid
      aside={headings.length > 0 ? <TableOfContents headings={headings} /> : undefined}
    >
      <Link
        href={`/${contentType.pluralSlug}`}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← {contentType.displayName} 목록으로
      </Link>
      <article>
        <header className="mb-8">
          <time className="text-sm text-muted-foreground">
            {formatKST(post.targetDate, "yyyy년 M월 d일 (EEEE)")}
          </time>
          <h1 className="text-2xl font-bold mt-2">{post.title}</h1>
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
