import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays } from "lucide-react";

interface Commit {
  id: string;
  repository: string;
  author: string;
  authorAvatar: string | null;
  additions: number;
  deletions: number;
}

interface TimelineItemProps {
  post: {
    id: string;
    slug: string;
    title: string;
    content: string;
    summary: string | null;
    targetDate: string;
    publishedAt: string | null;
    commits: Commit[];
  };
  isLatest?: boolean;
}

export function TimelineItem({ post, isLatest }: TimelineItemProps) {
  const targetDate = new Date(post.targetDate);
  const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null;

  // 고유한 레포지토리 목록
  const repos = [...new Set(post.commits.map((c) => c.repository))];

  // 고유한 저자 목록 (아바타 포함)
  const authors = post.commits.reduce((acc, commit) => {
    if (!acc.find((a) => a.name === commit.author)) {
      acc.push({
        name: commit.author,
        avatar: commit.authorAvatar,
      });
    }
    return acc;
  }, [] as { name: string; avatar: string | null }[]);

  // 총 변경량
  const totalAdditions = post.commits.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = post.commits.reduce((sum, c) => sum + c.deletions, 0);

  return (
    <article
      className={`group relative rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-tint/30 ${
        isLatest ? "border-tint/50 bg-tint-subtle" : ""
      }`}
    >
      <Link href={`/post/${post.slug}`} className="block">
        {/* 날짜 */}
        <time className="text-sm text-tint font-medium flex items-center gap-1.5 mb-2">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{format(targetDate, "M월 d일 (EEEE)", { locale: ko })}</span>
          {publishedAt && (
            <span className="text-muted-foreground text-xs font-normal">
              · {formatDistanceToNow(publishedAt, { addSuffix: true, locale: ko })}
            </span>
          )}
          {isLatest && (
            <span className="ml-2 px-2 py-0.5 bg-tint text-tint-foreground text-xs font-medium rounded">
              NEW
            </span>
          )}
        </time>

        {/* 제목 */}
        <h2 className="text-lg font-semibold group-hover:text-tint transition-colors line-clamp-2 mb-2">
          {post.title}
        </h2>

        {/* 본문 미리보기 */}
        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
          {post.summary || post.content?.slice(0, 200)}
        </p>

        {/* 메타 정보 */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          {/* 저자 아바타들 */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {authors.slice(0, 3).map((author, i) => (
                <Avatar key={i} className="w-6 h-6 border-2 border-background">
                  <AvatarImage src={author.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-tint/20 text-tint">
                    {author.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {authors.length > 3 && (
              <span className="ml-2 text-xs">+{authors.length - 3}</span>
            )}
          </div>

          {/* 레포지토리 태그 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {repos.slice(0, 2).map((repo) => (
              <span
                key={repo}
                className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
              >
                {repo}
              </span>
            ))}
            {repos.length > 2 && (
              <span className="text-xs">+{repos.length - 2}</span>
            )}
          </div>

          {/* 변경량 */}
          <div className="flex items-center gap-1 ml-auto text-xs">
            <span className="text-green-500">+{totalAdditions}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-red-500">-{totalDeletions}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
