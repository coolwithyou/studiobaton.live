import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatKST } from "@/lib/date-utils";
import { PageContainer } from "@/components/admin/ui/page-container";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { ExternalLink, Pencil } from "lucide-react";
import prisma from "@/lib/prisma";

interface Props {
  params: Promise<{ id: string }>;
}

async function getPost(id: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      targetDate: true,
      status: true,
      title: true,
      content: true,
      summary: true,
      slug: true,
      category: true,
      showInTimeline: true,
      commits: {
        select: {
          id: true,
          sha: true,
          repository: true,
          message: true,
          author: true,
          authorAvatar: true,
          additions: true,
          deletions: true,
          url: true,
          committedAt: true,
        },
        orderBy: { committedAt: "desc" },
      },
    },
  });

  return post;
}

async function getProjectMappings() {
  const mappings = await prisma.projectMapping.findMany({
    select: {
      repositoryName: true,
      displayName: true,
    },
  });
  return new Map(mappings.map((m) => [m.repositoryName, m.displayName]));
}

export default async function PostViewPage({ params }: Props) {
  const { id } = await params;
  const [post, repoDisplayNameMap] = await Promise.all([
    getPost(id),
    getProjectMappings(),
  ]);

  if (!post) {
    notFound();
  }

  // DRAFT 포스트는 수정 페이지로 리다이렉트
  if (post.status !== "PUBLISHED") {
    redirect(`/console/post/${id}/edit`);
  }

  // 커밋에서 사용된 고유 리포지토리 목록
  const usedRepositories = [...new Set(post.commits.map((c) => c.repository))];

  return (
    <PageContainer>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/console">← 목록</Link>
            </Button>
            <Badge variant="default">발행됨</Badge>
            {post.category && <Badge variant="outline">{post.category}</Badge>}
            {post.showInTimeline && <Badge variant="secondary">타임라인</Badge>}
          </div>
          <h1 className="text-2xl font-bold">
            {post.title || formatKST(post.targetDate, "yyyy년 M월 d일")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {formatKST(post.targetDate, "yyyy년 M월 d일")} · {post.commits.length}
            개의 커밋
          </p>
        </div>
        <div className="flex gap-2">
          {post.slug && (
            <Button variant="outline" asChild>
              <a href={`/post/${post.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                공개 페이지
              </a>
            </Button>
          )}
          <Button asChild>
            <Link href={`/console/post/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              수정하기
            </Link>
          </Button>
        </div>
      </div>

      {/* 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* 좌측: 메타 정보 */}
        <div className="space-y-4">
          {/* 요약 */}
          {post.summary && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold mb-2">요약</h3>
              <p className="text-sm text-muted-foreground">{post.summary}</p>
            </div>
          )}

          {/* URL */}
          {post.slug && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold mb-2">URL</h3>
              <code className="text-sm text-muted-foreground">
                /post/{post.slug}
              </code>
            </div>
          )}

          {/* 리포지토리 목록 */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold mb-3">사용된 리포지토리</h3>
            <ul className="space-y-3">
              {usedRepositories.map((repo) => {
                const displayName = repoDisplayNameMap.get(repo);
                return (
                  <li key={repo} className="text-sm">
                    <div className="font-medium">{displayName || repo}</div>
                    {displayName && (
                      <div className="text-muted-foreground font-mono text-xs">
                        {repo}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 우측: 본문 */}
        <div className="min-w-0">
          {/* 마크다운 미리보기 */}
          <div className="border rounded-lg p-6 bg-card prose prose-neutral dark:prose-invert max-w-none">
            <MarkdownRenderer content={post.content || ""} />
          </div>

          <Separator className="my-8" />

          {/* 커밋 목록 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">커밋 내역</h2>
            <div className="space-y-3">
              {post.commits.map((commit) => (
                <a
                  key={commit.id}
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">
                        {commit.message}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {repoDisplayNameMap.get(commit.repository) ||
                          commit.repository}{" "}
                        · {commit.author}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      <span className="text-green-600">+{commit.additions}</span>
                      {" / "}
                      <span className="text-red-600">-{commit.deletions}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
