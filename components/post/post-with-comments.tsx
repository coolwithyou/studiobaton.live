"use client";

import { useRef, useCallback, type ReactNode } from "react";
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
  const { comments, activeCommentId, isCreating, setActiveCommentId, addComment, deleteComment } =
    useComments();

  // 텍스트 선택 훅 (댓글 작성 권한이 있을 때만 활성화)
  const { selection, clearSelection } = useTextSelection(contentRef, canComment);

  // 하이라이트 훅 (호버 상태 포함)
  const { hoveredComment, clearHover } = useHighlightComments(
    comments,
    contentRef,
    activeCommentId,
    (commentId) => {
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

  // 호버된 댓글 찾기
  const hoveredCommentData = hoveredComment
    ? comments.find((c) => c.id === hoveredComment.id) ?? null
    : null;

  return (
    <div className="max-w-3xl">
      {/* 마크다운 콘텐츠 (하이라이트 대상) */}
      <div ref={contentRef} className="prose-container">
        {children}
      </div>

      {/* 호버 팝오버 */}
      <CommentHoverPopover
        comment={hoveredCommentData}
        position={hoveredComment?.position ?? null}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClose={clearHover}
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
