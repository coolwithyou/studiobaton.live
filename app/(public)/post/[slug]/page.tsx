import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, GitCommit, FolderGit2, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

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
      targetDate: true,
      publishedAt: true,
    },
  });

  if (!post) {
    return {
      title: "포스트를 찾을 수 없습니다",
    };
  }

  const description = post.summary || post.content?.slice(0, 160) || "";

  return {
    title: `${post.title} | studiobaton`,
    description,
    openGraph: {
      title: post.title || "studiobaton",
      description,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title || "studiobaton",
      description,
    },
    alternates: {
      canonical: `https://studiobaton.live/post/${slug}`,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;

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

  // 고유한 저자 목록
  const authors = post.commits.reduce((acc, commit) => {
    if (!acc.find((a) => a.name === commit.author)) {
      acc.push({
        name: commit.author,
        avatar: commit.authorAvatar,
      });
    }
    return acc;
  }, [] as { name: string; avatar: string | null }[]);

  // 레포지토리별 통계
  const repoStats = post.commits.reduce((acc, commit) => {
    if (!acc[commit.repository]) {
      acc[commit.repository] = { commits: 0, additions: 0, deletions: 0 };
    }
    acc[commit.repository].commits++;
    acc[commit.repository].additions += commit.additions;
    acc[commit.repository].deletions += commit.deletions;
    return acc;
  }, {} as Record<string, { commits: number; additions: number; deletions: number }>);

  return (
    <div className="container mx-auto px-4 max-w-3xl py-8">
      {/* 뒤로가기 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-tint transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>타임라인으로</span>
      </Link>

      <article>
        {/* 헤더 */}
        <header className="mb-8">
          <time className="inline-flex items-center gap-1.5 text-sm text-tint font-medium">
            <Calendar className="w-4 h-4" />
            {format(post.targetDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
          </time>
          <h1 className="text-2xl md:text-3xl font-bold mt-3 leading-tight">
            {post.title}
          </h1>

          {/* 저자 */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex -space-x-2">
              {authors.slice(0, 5).map((author, i) => (
                <Avatar key={i} className="w-9 h-9 border-2 border-background">
                  <AvatarImage src={author.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-tint/10 text-tint">
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

        {/* 본문 */}
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-tint prose-a:no-underline hover:prose-a:underline">
          {post.content?.split("\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <Separator className="my-10" />

        {/* 레포지토리별 통계 */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <FolderGit2 className="w-5 h-5 text-tint" />
            작업한 프로젝트
          </h2>
          <div className="grid gap-3">
            {Object.entries(repoStats).map(([repo, stats]) => (
              <div
                key={repo}
                className="flex items-center justify-between p-4 bg-tint-subtle rounded-xl border border-tint/10"
              >
                <span className="font-medium">{repo}</span>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GitCommit className="w-3.5 h-3.5" />
                    {stats.commits}개
                  </span>
                  <span className="text-green-600 dark:text-green-400">+{stats.additions}</span>
                  <span className="text-red-600 dark:text-red-400">-{stats.deletions}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 커밋 목록 */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <GitCommit className="w-5 h-5 text-tint" />
            상세 커밋 내역
          </h2>
          <div className="space-y-2 rounded-xl border overflow-hidden">
            {post.commits.map((commit, index) => (
              <a
                key={commit.id}
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-start gap-3 p-4 hover:bg-tint-hover transition-colors group ${
                  index !== post.commits.length - 1 ? "border-b" : ""
                }`}
              >
                <Avatar className="w-7 h-7 mt-0.5 shrink-0">
                  <AvatarImage src={commit.authorAvatar || undefined} />
                  <AvatarFallback className="text-xs bg-tint/10 text-tint">
                    {commit.author.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate group-hover:text-tint transition-colors flex items-center gap-1">
                    {commit.message.split("\n")[0]}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-foreground/70">{commit.repository}</span>
                    {" · "}
                    {commit.author}
                    {" · "}
                    <span className="text-green-600 dark:text-green-400">+{commit.additions}</span>
                    {" / "}
                    <span className="text-red-600 dark:text-red-400">-{commit.deletions}</span>
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </article>

      {/* JSON-LD */}
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
