"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatKST } from "@/lib/date-utils";
import { getPostUrl } from "@/lib/post-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PostForList } from "./mail-layout";

/** ContentType slug → 컬러 도트 매핑 */
const CONTENT_TYPE_COLORS: Record<string, string> = {
  log: "bg-blue-500",
  story: "bg-purple-500",
  notice: "bg-amber-500",
};

/** ContentType slug → 표시 이름 */
const CONTENT_TYPE_LABELS: Record<string, string> = {
  log: "개발 로그",
  story: "스토리",
  notice: "공지",
};

const DEFAULT_DOT_COLOR = "bg-zinc-500";

interface PostListItemProps {
  post: PostForList;
  isSelected: boolean;
  onSelect: (slug: string) => void;
}

export function PostListItem({ post, isSelected, onSelect }: PostListItemProps) {
  const dotColor =
    CONTENT_TYPE_COLORS[post.contentType?.slug ?? ""] ?? DEFAULT_DOT_COLOR;
  const categoryLabel =
    CONTENT_TYPE_LABELS[post.contentType?.slug ?? ""] ?? post.contentType?.slug ?? "";

  // 고유 저자 추출
  const uniqueAuthors = getUniqueAuthors(post.commits);

  // 레포지토리
  const repos = [...new Set(post.commits.map((c) => c.repository))];

  // 변경량
  const totalAdditions = post.commits.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = post.commits.reduce((sum, c) => sum + c.deletions, 0);

  return (
    <>
      {/* 데스크톱: 클릭 시 상세 패널 표시 */}
      <button
        type="button"
        onClick={() => onSelect(post.slug)}
        className="hidden lg:block w-full text-left"
      >
        <ItemContent
          post={post}
          dotColor={dotColor}
          categoryLabel={categoryLabel}
          uniqueAuthors={uniqueAuthors}
          repos={repos}
          totalAdditions={totalAdditions}
          totalDeletions={totalDeletions}
          isSelected={isSelected}
        />
      </button>

      {/* 모바일: 기존 상세 페이지로 이동 */}
      <Link href={getPostUrl(post)} className="block lg:hidden">
        <ItemContent
          post={post}
          dotColor={dotColor}
          categoryLabel={categoryLabel}
          uniqueAuthors={uniqueAuthors}
          repos={repos}
          totalAdditions={totalAdditions}
          totalDeletions={totalDeletions}
          isSelected={false}
        />
      </Link>
    </>
  );
}

function ItemContent({
  post,
  dotColor,
  categoryLabel,
  uniqueAuthors,
  repos,
  totalAdditions,
  totalDeletions,
  isSelected,
}: {
  post: PostForList;
  dotColor: string;
  categoryLabel: string;
  uniqueAuthors: { name: string; avatar: string | null }[];
  repos: string[];
  totalAdditions: number;
  totalDeletions: number;
  isSelected: boolean;
}) {
  return (
    <div
      className={cn(
        "px-4 py-3 border-l-2 transition-colors",
        isSelected
          ? "border-l-[var(--key-color)] bg-[oklch(1_0_0/5%)]"
          : "border-l-transparent hover:bg-[oklch(1_0_0/3%)]"
      )}
    >
      {/* 1행: 컬러도트 + 날짜 + 카테고리명 */}
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
        <time className="text-xs text-muted-foreground">
          {formatKST(post.targetDate, "M월 d일")}
        </time>
        {categoryLabel && (
          <span className="text-xs text-muted-foreground ml-auto">
            {categoryLabel}
          </span>
        )}
      </div>

      {/* 2행: 제목 */}
      <h3 className="text-sm font-semibold truncate">{post.title}</h3>

      {/* 3행: 아바타 + 레포 + 변경량 (COMMIT_BASED일 때만) */}
      {post.type === "COMMIT_BASED" && post.commits.length > 0 && (
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          {/* 저자 아바타들 */}
          {uniqueAuthors.length > 0 && (
            <div className="flex -space-x-1.5">
              {uniqueAuthors.slice(0, 3).map((author, i) => (
                <Avatar key={i} className="w-4 h-4 border border-background">
                  <AvatarImage src={author.avatar ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {author.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}

          {/* 레포지토리명 */}
          {repos.length > 0 && (
            <span className="truncate max-w-[120px]">{repos[0]}</span>
          )}

          {/* 변경량 */}
          <div className="flex items-center gap-0.5 ml-auto shrink-0">
            <span className="text-green-600">+{totalAdditions}</span>
            <span>/</span>
            <span className="text-red-600">-{totalDeletions}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getUniqueAuthors(
  commits: PostForList["commits"]
): { name: string; avatar: string | null }[] {
  const seen = new Map<string, { name: string; avatar: string | null }>();
  for (const c of commits) {
    if (!seen.has(c.author)) {
      seen.set(c.author, { name: c.author, avatar: c.authorAvatar });
    }
  }
  return [...seen.values()];
}
