"use client";

import { useEffect, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatKST } from "@/lib/date-utils";
import { getPostDetail } from "@/lib/actions/post-detail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PostDetail = NonNullable<Awaited<ReturnType<typeof getPostDetail>>>;

interface PostDetailPanelProps {
  slug: string;
}

export function PostDetailPanel({ slug }: PostDetailPanelProps) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    startTransition(async () => {
      const data = await getPostDetail(slug);
      if (data) {
        setPost(data);
      } else {
        setError(true);
      }
    });
  }, [slug]);

  if (isPending && !post) {
    return <DetailSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">포스트를 찾을 수 없습니다.</p>
      </div>
    );
  }

  if (!post) return null;

  const totalAdditions = post.commits.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = post.commits.reduce((sum, c) => sum + c.deletions, 0);

  return (
    <div className="h-full">
      <article className="px-8 py-6 max-w-3xl">
        {/* 메타 정보 */}
        <div className="mb-6">
          {post.contentType?.displayName && (
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {post.contentType.displayName}
            </span>
          )}
          <h1 className="text-2xl font-bold mt-1">{post.title}</h1>
          <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
            <time>{formatKST(post.targetDate, "yyyy년 M월 d일 (EEEE)")}</time>
            {post.type === "COMMIT_BASED" && post.commits.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-green-600">+{totalAdditions}</span>
                <span>/</span>
                <span className="text-red-600">-{totalDeletions}</span>
              </div>
            )}
          </div>

          {/* 커밋 저자 */}
          {post.commits.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {getUniqueCommitAuthors(post.commits).map((author, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={author.avatar ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {author.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{author.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 로딩 오버레이 */}
        <div className={isPending ? "opacity-50 transition-opacity" : ""}>
          {/* 마크다운 본문 */}
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content ?? ""}
            </ReactMarkdown>
          </div>
        </div>
      </article>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="px-8 py-6 animate-pulse">
      <div className="h-3 w-20 bg-muted rounded mb-3" />
      <div className="h-7 w-3/4 bg-muted rounded mb-4" />
      <div className="h-3 w-40 bg-muted rounded mb-8" />
      <div className="space-y-3">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
        <div className="h-3 w-4/6 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
    </div>
  );
}

function getUniqueCommitAuthors(
  commits: PostDetail["commits"]
): { name: string; avatar: string | null }[] {
  const seen = new Map<string, { name: string; avatar: string | null }>();
  for (const c of commits) {
    if (!seen.has(c.author)) {
      seen.set(c.author, { name: c.author, avatar: c.authorAvatar });
    }
  }
  return [...seen.values()];
}
