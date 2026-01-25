"use client";

import { useRef, useCallback, useEffect, type ReactNode } from "react";
import {
  CommentProvider,
  SelectionPopover,
  CommentHoverPopover,
  useComments,
  type Comment,
} from "@/components/comments";
import { useTextSelection } from "@/hooks/use-text-selection";
import { useHighlightComments } from "@/hooks/use-highlight-comments";
import type { XPathRange } from "@/lib/xpath";

interface PostWithCommentsProps {
  postSlug: string;
  initialComments: Comment[];
  currentUserId: string | null;
  canComment: boolean;
  isAdmin: boolean;
  children: ReactNode;
}

/**
 * 댓글 기능이 통합된 포스트 뷰어
 * 서버에서 렌더링된 마크다운 콘텐츠를 감싸서 인라인 댓글 기능 제공
 */
export function PostWithComments({
  postSlug,
  initialComments,
  currentUserId,
  canComment,
  isAdmin,
  children,
}: PostWithCommentsProps) {
  return (
    <CommentProvider postSlug={postSlug} initialComments={initialComments}>
      <PostWithCommentsInner
        currentUserId={currentUserId}
        canComment={canComment}
        isAdmin={isAdmin}
      >
        {children}
      </PostWithCommentsInner>
    </CommentProvider>
  );
}

interface PostWithCommentsInnerProps {
  currentUserId: string | null;
  canComment: boolean;
  isAdmin: boolean;
  children: ReactNode;
}

function PostWithCommentsInner({
  currentUserId,
  canComment,
  isAdmin,
  children,
}: PostWithCommentsInnerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { comments, activeCommentId, isCreating, setActiveCommentId, addComment, deleteComment } =
    useComments();

  // 텍스트 선택 훅 (댓글 작성 권한이 있을 때만 활성화)
  const { selection, clearSelection } = useTextSelection(contentRef, canComment);

  // 하이라이트 훅 (호버 상태 포함)
  const { hoveredComment, clearHover, getCommentPosition } = useHighlightComments(
    comments,
    contentRef,
    activeCommentId,
    (commentId) => {
      // 클릭 시 activeCommentId 설정 (팝오버 고정)
      setActiveCommentId(activeCommentId === commentId ? null : commentId);
    }
  );

  // 댓글 추가 핸들러
  const handleAddComment = useCallback(
    async (content: string, xpathRange: XPathRange) => {
      await addComment({
        ...xpathRange,
        content,
      });
      clearSelection();
    },
    [addComment, clearSelection]
  );

  // 팝오버 닫기 핸들러
  const handleClosePopover = useCallback(() => {
    clearHover();
    setActiveCommentId(null);
  }, [clearHover, setActiveCommentId]);

  // 외부 클릭 시 팝오버 닫기
  useEffect(() => {
    if (!activeCommentId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // 팝오버 내부 클릭은 무시 (AlertDialog 포함)
      if (popoverRef.current?.contains(target)) return;
      // AlertDialog는 portal로 렌더링되므로 별도 체크
      const alertDialog = document.querySelector('[role="alertdialog"]');
      if (alertDialog?.contains(target)) return;

      handleClosePopover();
    };

    // 약간의 딜레이로 클릭 이벤트가 즉시 발생하는 것 방지
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [activeCommentId, handleClosePopover]);

  // 표시할 댓글 결정: 클릭된 댓글 > 호버된 댓글
  const activeComment = activeCommentId
    ? comments.find((c) => c.id === activeCommentId) ?? null
    : null;
  const hoveredCommentData = hoveredComment
    ? comments.find((c) => c.id === hoveredComment.id) ?? null
    : null;

  // 클릭 고정 시 해당 댓글의 위치 계산
  const getActiveCommentPosition = useCallback(() => {
    if (!activeCommentId || !contentRef.current) return null;
    const pos = getCommentPosition(activeCommentId);
    if (!pos) return null;

    const containerRect = contentRef.current.getBoundingClientRect();
    return {
      x: containerRect.left + containerRect.width / 2,
      y: containerRect.top + pos.top - contentRef.current.scrollTop,
    };
  }, [activeCommentId, getCommentPosition]);

  // 최종 표시할 댓글과 위치
  const displayComment = activeComment || hoveredCommentData;
  const displayPosition = activeComment
    ? getActiveCommentPosition()
    : hoveredComment?.position ?? null;

  return (
    <div className="max-w-3xl">
      {/* 마크다운 콘텐츠 (하이라이트 대상) */}
      <div ref={contentRef} className="prose-container">
        {children}
      </div>

      {/* 호버/클릭 팝오버 */}
      <CommentHoverPopover
        ref={popoverRef}
        comment={displayComment}
        position={displayPosition}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        isLocked={!!activeComment}
        onClose={handleClosePopover}
        onDelete={deleteComment}
      />

      {/* 텍스트 선택 팝오버 (댓글 작성 권한이 있을 때만) */}
      {canComment && (
        <SelectionPopover
          selection={selection}
          isCreating={isCreating}
          onAddComment={handleAddComment}
          onCancel={clearSelection}
        />
      )}
    </div>
  );
}
