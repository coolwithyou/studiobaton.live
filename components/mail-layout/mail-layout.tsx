"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { OverlayScrollbars } from "overlayscrollbars";
import { PostListItem } from "./post-list-item";
import { PostDetailPanel } from "./post-detail-panel";
import { EmptyState } from "./empty-state";

export interface CommitForList {
  id: string;
  repository: string;
  author: string;
  authorAvatar: string | null;
  additions: number;
  deletions: number;
}

export interface PostForList {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  targetDate: string;
  type: "COMMIT_BASED" | "MANUAL";
  contentType?: {
    slug?: string;
    pluralSlug?: string;
  } | null;
  commits: CommitForList[];
}

interface MailLayoutProps {
  posts: PostForList[];
}

const OS_OPTIONS = {
  scrollbars: {
    theme: "os-theme-ios",
    visibility: "auto" as const,
    autoHide: "scroll" as const,
    autoHideDelay: 800,
    autoHideSuspend: true,
    dragScroll: true,
    clickScroll: false,
    pointers: ["mouse", "touch", "pen"] as string[],
  },
  overflow: { x: "hidden" as const, y: "scroll" as const },
};

export function MailLayout({ posts }: MailLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("post");

  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // OverlayScrollbars 초기화
  useEffect(() => {
    const instances: OverlayScrollbars[] = [];
    if (listRef.current) {
      instances.push(OverlayScrollbars(listRef.current, OS_OPTIONS));
    }
    if (detailRef.current) {
      instances.push(OverlayScrollbars(detailRef.current, OS_OPTIONS));
    }
    return () => instances.forEach((i) => i.destroy());
  }, []);

  const handleSelect = useCallback(
    (slug: string) => {
      router.push(`/?post=${slug}`, { scroll: false });
    },
    [router]
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* 리스트 패널 */}
      <div
        ref={listRef}
        className="w-full lg:w-80 lg:shrink-0 lg:border-r lg:border-border overflow-y-auto"
      >
        {posts.map((post) => (
          <PostListItem
            key={post.id}
            post={post}
            isSelected={post.slug === selectedSlug}
            onSelect={handleSelect}
          />
        ))}
        {posts.length === 0 && (
          <div className="text-center py-20 text-sm text-muted-foreground">
            아직 발행된 글이 없습니다.
          </div>
        )}
      </div>

      {/* 상세 패널 - lg 이상에서만 */}
      <div
        ref={detailRef}
        className="hidden lg:flex lg:flex-1 lg:min-w-0 overflow-y-auto"
      >
        {selectedSlug ? (
          <PostDetailPanel slug={selectedSlug} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
