"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { CommentCard } from "./comment-card";
import { useComments } from "./comment-provider";
import type { CommentHighlight } from "@/hooks/use-highlight-comments";
import { cn } from "@/lib/utils";

interface CommentSidebarProps {
  contentRef: React.RefObject<HTMLElement | null>;
  currentUserId: string | null;
  isAdmin: boolean;
  className?: string;
}

interface CommentPosition {
  id: string;
  top: number;
  displayTop: number;
}

const MIN_GAP = 8; // 댓글 간 최소 간격
const COMMENT_HEIGHT = 120; // 예상 댓글 카드 높이

export function CommentSidebar({
  contentRef,
  currentUserId,
  isAdmin,
  className,
}: CommentSidebarProps) {
  const { comments, activeCommentId, setActiveCommentId, deleteComment } =
    useComments();
  const [positions, setPositions] = useState<Map<string, number>>(new Map());

  // 댓글 위치 계산
  const calculatePositions = useCallback(() => {
    if (!contentRef.current || typeof window === "undefined") return;

    // CSS Custom Highlight API의 Range를 직접 사용하기 어려우므로
    // XPath로 다시 계산
    const { restoreCommentRange } = require("@/lib/xpath");
    const newPositions = new Map<string, number>();

    comments.forEach((comment) => {
      const range = restoreCommentRange(comment, contentRef.current!);
      if (range) {
        const rects = range.getClientRects();
        if (rects.length > 0) {
          const containerRect = contentRef.current!.getBoundingClientRect();
          const firstRect = rects[0];
          newPositions.set(
            comment.id,
            firstRect.top - containerRect.top + contentRef.current!.scrollTop
          );
        }
      }
    });

    setPositions(newPositions);
  }, [comments, contentRef]);

  // 초기 계산 및 리사이즈 시 재계산
  useEffect(() => {
    // 콘텐츠 렌더링 후 약간의 딜레이
    const timer = setTimeout(calculatePositions, 100);

    window.addEventListener("resize", calculatePositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculatePositions);
    };
  }, [calculatePositions]);

  // 겹침 방지 로직
  const arrangedPositions = useMemo((): CommentPosition[] => {
    const sorted = [...comments]
      .map((comment) => ({
        id: comment.id,
        top: positions.get(comment.id) ?? 0,
        displayTop: positions.get(comment.id) ?? 0,
      }))
      .sort((a, b) => a.top - b.top);

    // 겹침 방지
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const minTop = prev.displayTop + COMMENT_HEIGHT + MIN_GAP;

      if (curr.displayTop < minTop) {
        curr.displayTop = minTop;
      }
    }

    return sorted;
  }, [comments, positions]);

  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId);
  };

  if (comments.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-muted-foreground",
          className
        )}
      >
        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">아직 댓글이 없습니다</p>
        <p className="text-xs mt-1">텍스트를 선택하여 댓글을 추가하세요</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 sticky top-0 bg-background/80 backdrop-blur-sm py-2">
        댓글 ({comments.length})
      </h3>

      <div className="relative" style={{ minHeight: arrangedPositions.length > 0
        ? arrangedPositions[arrangedPositions.length - 1].displayTop + COMMENT_HEIGHT
        : 0
      }}>
        {arrangedPositions.map((pos) => {
          const comment = comments.find((c) => c.id === pos.id);
          if (!comment) return null;

          const canDelete =
            currentUserId === comment.author.id || isAdmin;

          return (
            <div
              key={comment.id}
              className="absolute left-0 right-0 transition-all duration-200"
              style={{ top: pos.displayTop }}
            >
              <CommentCard
                comment={comment}
                isActive={activeCommentId === comment.id}
                canDelete={canDelete}
                onSelect={() =>
                  setActiveCommentId(
                    activeCommentId === comment.id ? null : comment.id
                  )
                }
                onDelete={() => handleDelete(comment.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
