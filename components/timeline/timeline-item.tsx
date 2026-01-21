import Link from "next/link";
import { formatKST, formatDistanceToNowKST } from "@/lib/date-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { stripMarkdown } from "@/lib/strip-markdown";

interface Commit {
  id: string;
  repository: string;
  author: string;
  authorAvatar: string | null;
  additions: number;
  deletions: number;
}

interface Author {
  name: string;
  avatar: string | null;
  originalAuthors: string[];
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
    type: "COMMIT_BASED" | "MANUAL";
  };
  /** 정규화된 저자 목록 (서버에서 계산) */
  authors: Author[];
  isLatest?: boolean;
}

export function TimelineItem({ post, authors, isLatest }: TimelineItemProps) {
  // 고유한 레포지토리 목록
  const repos = [...new Set(post.commits.map((c) => c.repository))];

  // 총 변경량
  const totalAdditions = post.commits.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = post.commits.reduce((sum, c) => sum + c.deletions, 0);

  return (
    <article className="relative pl-8 pb-8">
      {/* 타임라인 라인 */}
      <div className="absolute left-[5px] top-4 bottom-0 w-px bg-border" />

      {/* 타임라인 도트 */}
      <div
        className={`absolute left-[3px] top-1.5 w-[7px] h-[7px] rounded-full ${
          isLatest ? "bg-foreground" : "bg-muted-foreground/40"
        }`}
      />

      {/* 컨텐츠 */}
      <div className="ml-4">
        {/* 날짜 */}
        <time className="text-sm text-muted-foreground flex items-center gap-2">
          <span>{formatKST(post.targetDate, "M월 d일 (EEEE)")}</span>
          <span className="text-xs">
            · {formatDistanceToNowKST(post.targetDate)}
          </span>
        </time>

        {/* 제목 */}
        <Link
          href={post.type === "COMMIT_BASED" ? `/log/${post.slug}` : `/post/${post.slug}`}
          className="block group mt-2"
        >
          <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
            {post.title}
          </h2>
        </Link>

        {/* 본문 미리보기 */}
        <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">
          {stripMarkdown(post.summary || post.content || "").slice(0, 200)}
        </p>

        {/* 메타 정보 */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          {/* 저자 아바타들 */}
          {authors.length > 0 && (
            <div className="flex -space-x-2">
              {authors.map((author, i) => (
                <Avatar key={i} className="w-6 h-6 border-2 border-background">
                  <AvatarImage src={author.avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {author.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}

          {/* 레포지토리 태그 (커밋이 있는 경우만 표시) */}
          {repos.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {repos.slice(0, 2).map((repo) => (
                <span
                  key={repo}
                  className="text-xs"
                >
                  {repo}
                </span>
              ))}
              {repos.length > 2 && (
                <span className="text-xs">외 {repos.length - 2}개</span>
              )}
            </div>
          )}

          {/* 변경량 (커밋이 있는 경우만 표시) */}
          {post.commits.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-green-600">+{totalAdditions}</span>
              <span>/</span>
              <span className="text-red-600">-{totalDeletions}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
