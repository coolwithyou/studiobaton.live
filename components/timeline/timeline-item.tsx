import Link from "next/link";
import Image from "next/image";
import { formatKST, formatDistanceToNowKST } from "@/lib/date-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { stripMarkdown } from "@/lib/strip-markdown";
import { getPostUrl } from "@/lib/post-url";

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
    thumbnailUrl?: string | null;
    contentType?: {
      slug?: string;
      pluralSlug?: string;
    } | null;
  };
  /** 정규화된 저자 목록 (서버에서 계산) */
  authors: Author[];
  isLatest?: boolean;
  /** 타임라인 라인/도트 숨김 여부 */
  hideTimeline?: boolean;
}

export function TimelineItem({ post, authors, isLatest, hideTimeline = false }: TimelineItemProps) {
  // 고유한 레포지토리 목록
  const repos = [...new Set(post.commits.map((c) => c.repository))];

  // GIF 이미지 여부 확인 (애니메이션 유지를 위해 unoptimized 필요)
  const isGif = post.thumbnailUrl?.toLowerCase().endsWith(".gif");

  // 총 변경량
  const totalAdditions = post.commits.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = post.commits.reduce((sum, c) => sum + c.deletions, 0);

  return (
    <article className={`relative pb-8 ${hideTimeline ? "" : "md:pl-8"}`}>
      {/* 타임라인 라인 - 모바일에서 숨김 */}
      {!hideTimeline && (
        <div className="hidden md:block absolute left-[5px] top-4 bottom-0 w-px bg-border" />
      )}

      {/* 타임라인 도트 - 모바일에서 숨김 */}
      {!hideTimeline && (
        <div
          className={`hidden md:block absolute left-[3px] top-1.5 w-[7px] h-[7px] rounded-full ${
            isLatest ? "bg-foreground" : "bg-muted-foreground/40"
          }`}
        />
      )}

      {/* 컨텐츠 */}
      <div className={hideTimeline ? "" : "md:ml-4"}>
        {/* 썸네일 이미지 */}
        {post.thumbnailUrl && (
          <Link
            href={getPostUrl(post)}
            className="block group mb-4"
          >
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <Image
                src={post.thumbnailUrl}
                alt={post.title}
                fill
                unoptimized={isGif}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </Link>
        )}

        {/* 날짜 */}
        <time className="text-sm text-muted-foreground flex items-center gap-2">
          <span>{formatKST(post.targetDate, "M월 d일 (EEEE)")}</span>
          <span className="text-xs">
            · {formatDistanceToNowKST(post.targetDate)}
          </span>
        </time>

        {/* 제목 */}
        <Link
          href={getPostUrl(post)}
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

        {/* 메타 정보 - COMMIT_BASED 타입에서만 커밋 관련 정보 표시 */}
        {post.type === "COMMIT_BASED" && (
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
        )}
      </div>
    </article>
  );
}
