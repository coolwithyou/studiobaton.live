import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { hasUnmaskPermission } from "@/lib/auth-helpers";
import { applyPostMaskingAsync } from "@/lib/masking";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { SITE_URL, SITE_NAME } from "@/lib/config";

// 동적 렌더링 강제
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// 마크다운 문법 제거하여 순수 텍스트 추출
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // 제목 (# ## ### 등)
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 볼드 **text**
    .replace(/\*([^*]+)\*/g, "$1") // 이탤릭 *text*
    .replace(/__([^_]+)__/g, "$1") // 볼드 __text__
    .replace(/_([^_]+)_/g, "$1") // 이탤릭 _text_
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // 인라인 코드 및 코드 블록
    .replace(/^\s*[-*+]\s+/gm, "") // 리스트 아이템
    .replace(/^\s*\d+\.\s+/gm, "") // 숫자 리스트
    .replace(/^\s*>\s+/gm, "") // 인용문
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 링크 [text](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // 이미지 ![alt](url)
    .replace(/\n+/g, " ") // 줄바꿈을 공백으로
    .replace(/\s+/g, " ") // 연속 공백 정리
    .trim();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      title: true,
      summary: true,
      content: true,
      targetDate: true,
      publishedAt: true,
    },
  });

  if (!post) {
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
      commits: {
        orderBy: {
          committedAt: "asc",
        },
      },
      publishedBy: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!post || post.status !== "PUBLISHED") {
    notFound();
  }

  // 마스킹 적용
  const maskedPost = await applyPostMaskingAsync(
    {
      ...post,
      commits: post.commits.map((c) => ({
        id: c.id,
        repository: c.repository,
        message: c.message,
        author: c.author,
        authorAvatar: c.authorAvatar,
        additions: c.additions,
        deletions: c.deletions,
        url: c.url,
        committedAt: c.committedAt,
      })),
    },
    isAuthenticated
  );

  // 고유한 저자 목록 (마스킹된 데이터 기준)
  const authors = maskedPost.commits.reduce((acc, commit) => {
    if (!acc.find((a) => a.name === commit.author)) {
      acc.push({
        name: commit.author,
        avatar: commit.authorAvatar,
      });
    }
    return acc;
  }, [] as { name: string; avatar: string | null }[]);

  // 레포지토리별 통계 (마스킹된 데이터 기준)
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
    <div className="container mx-auto px-4 max-w-2xl py-8">
      {/* 뒤로가기 */}
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← 타임라인으로
      </Link>

      <article>
        {/* 헤더 */}
        <header className="mb-8">
          <time className="text-sm text-muted-foreground">
            {format(post.targetDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
          </time>
          <h1 className="text-2xl font-bold mt-2">{post.title}</h1>

          {/* 저자 */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex -space-x-2">
              {authors.slice(0, 5).map((author, i) => (
                <Avatar key={i} className="w-8 h-8 border-2 border-background">
                  <AvatarImage src={author.avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {author.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {authors.map((a) => a.name).join(", ")}
            </span>
          </div>
        </header>

        {/* 본문 (마크다운 파싱) */}
        <MarkdownRenderer
          content={maskedPost.content || ""}
          className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:my-1"
        />

        {/* 마스킹 안내 (비로그인 사용자에게만 표시) */}
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            개발자 개인정보와 고객사 정보 보호를 위해 프로젝트명 및 일부 세부 정보가 마스킹 처리되어 있습니다.
          </p>
        )}

        <Separator className="my-8" />

        {/* 레포지토리별 통계 */}
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

        {/* 커밋 목록 */}
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
                  className={`block p-3 rounded-lg transition-colors ${commit.url ? "hover:bg-muted/50 group cursor-pointer" : "bg-muted/30"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-6 h-6 mt-0.5">
                      <AvatarImage src={commit.authorAvatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {commit.author.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-mono truncate transition-colors ${commit.url ? "group-hover:text-primary" : ""
                          }`}
                      >
                        {commit.message.split("\n")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {commit.repository} · {commit.author} ·{" "}
                        <span className="text-green-600">+{commit.additions}</span>
                        {" / "}
                        <span className="text-red-600">-{commit.deletions}</span>
                      </p>
                    </div>
                  </div>
                </CommitWrapper>
              );
            })}
          </div>
        </section>

        {/* 마스킹 안내 (비로그인 사용자에게만 표시) */}
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground text-center mt-8 border-t pt-6">
            개발자 개인정보와 고객사 정보 보호를 위해 프로젝트명 및 일부 세부 정보가 마스킹 처리되어 있습니다.
          </p>
        )}
      </article>

      {/* JSON-LD (마스킹된 데이터 사용) */}
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
    </div>
  );
}
