import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <article className="relative pl-8 pb-8">
      {/* 타임라인 라인 */}
      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />

      {/* 타임라인 도트 */}
      <div
        className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 bg-background flex items-center justify-center ${
          isLatest ? "border-primary" : "border-muted-foreground/30"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            isLatest ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        />
      </div>

      {/* 컨텐츠 */}
      <div className="ml-4">
        {/* 날짜 */}
        <time className="text-sm text-muted-foreground flex items-center gap-2">
          <span>{format(targetDate, "M월 d일 (EEEE)", { locale: ko })}</span>
          {publishedAt && (
            <span className="text-xs">
              · {formatDistanceToNow(publishedAt, { addSuffix: true, locale: ko })}
            </span>
          )}
        </time>

        {/* 제목 */}
        <Link href={`/post/${post.slug}`} className="block group mt-2">
          <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
            {post.title}
          </h2>
        </Link>

        {/* 본문 미리보기 */}
        <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">
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
                  <AvatarFallback className="text-xs">
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
            {repos.slice(0, 3).map((repo) => (
              <span
                key={repo}
                className="px-2 py-0.5 bg-muted rounded-full text-xs"
              >
                {repo}
              </span>
            ))}
            {repos.length > 3 && (
              <span className="text-xs">+{repos.length - 3}</span>
            )}
          </div>

          {/* 변경량 */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-green-600">+{totalAdditions}</span>
            <span>/</span>
            <span className="text-red-600">-{totalDeletions}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
