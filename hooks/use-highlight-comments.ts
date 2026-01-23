"use client";

import { useEffect, useCallback, useRef } from "react";
import { restoreCommentRange, type XPathRange } from "@/lib/xpath";

export interface CommentHighlight extends XPathRange {
  id: string;
}

// CSS Custom Highlight API 스타일 (동적 주입)
const HIGHLIGHT_STYLES = `
::highlight(comment) {
  background-color: rgba(255, 217, 112, 0.35);
  cursor: pointer;
}
::highlight(comment-active) {
  background-color: rgba(255, 217, 112, 0.6);
}
.dark ::highlight(comment) {
  background-color: rgba(255, 217, 112, 0.25);
}
.dark ::highlight(comment-active) {
  background-color: rgba(255, 217, 112, 0.45);
}
`;

let stylesInjected = false;

function injectHighlightStyles() {
  if (stylesInjected || typeof document === "undefined") return;

  const style = document.createElement("style");
  style.id = "comment-highlight-styles";
  style.textContent = HIGHLIGHT_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

/**
 * CSS Custom Highlight API를 사용하여 댓글 위치 하이라이트
 * 브라우저 지원: Chrome 105+, Safari 17.2+, Firefox 140+
 */
export function useHighlightComments(
  comments: CommentHighlight[],
  contentRef: React.RefObject<HTMLElement | null>,
  activeCommentId: string | null,
  onCommentClick?: (commentId: string) => void
) {
  const rangeMapRef = useRef<Map<string, Range>>(new Map());
  const clickListenersRef = useRef<Map<Range, () => void>>(new Map());

  // 하이라이트 클릭 핸들러
  const handleHighlightClick = useCallback(
    (event: MouseEvent) => {
      if (!contentRef.current || !onCommentClick) return;

      const selection = window.getSelection();
      // 텍스트 선택 중이면 무시
      if (selection && !selection.isCollapsed) return;

      // 클릭 위치에서 가장 가까운 하이라이트 찾기
      const x = event.clientX;
      const y = event.clientY;

      for (const [commentId, range] of rangeMapRef.current) {
        const rects = range.getClientRects();
        for (const rect of rects) {
          if (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
          ) {
            event.preventDefault();
            event.stopPropagation();
            onCommentClick(commentId);
            return;
          }
        }
      }
    },
    [contentRef, onCommentClick]
  );

  // 하이라이트 업데이트
  useEffect(() => {
    if (!contentRef.current) return;

    // CSS Custom Highlight API 지원 확인
    if (typeof CSS === "undefined" || !("highlights" in CSS)) {
      console.warn("CSS Custom Highlight API is not supported in this browser");
      return;
    }

    // 스타일 동적 주입
    injectHighlightStyles();

    // 기존 하이라이트 정리
    CSS.highlights.delete("comment");
    CSS.highlights.delete("comment-active");
    rangeMapRef.current.clear();

    const normalRanges: Range[] = [];
    const activeRanges: Range[] = [];

    // 각 댓글에 대해 Range 생성
    comments.forEach((comment) => {
      const range = restoreCommentRange(comment, contentRef.current!);
      if (!range) return;

      rangeMapRef.current.set(comment.id, range);

      if (comment.id === activeCommentId) {
        activeRanges.push(range);
      } else {
        normalRanges.push(range);
      }
    });

    // 하이라이트 등록
    if (normalRanges.length > 0) {
      CSS.highlights.set("comment", new Highlight(...normalRanges));
    }
    if (activeRanges.length > 0) {
      CSS.highlights.set("comment-active", new Highlight(...activeRanges));
    }

    return () => {
      CSS.highlights.delete("comment");
      CSS.highlights.delete("comment-active");
    };
  }, [comments, contentRef, activeCommentId]);

  // 클릭 이벤트 리스너
  useEffect(() => {
    if (!contentRef.current || !onCommentClick) return;

    const content = contentRef.current;
    content.addEventListener("click", handleHighlightClick);

    return () => {
      content.removeEventListener("click", handleHighlightClick);
    };
  }, [contentRef, onCommentClick, handleHighlightClick]);

  // 특정 댓글의 위치 반환 (사이드바 정렬용)
  const getCommentPosition = useCallback(
    (commentId: string): { top: number; height: number } | null => {
      if (!contentRef.current) return null;

      const range = rangeMapRef.current.get(commentId);
      if (!range) return null;

      const rects = range.getClientRects();
      if (rects.length === 0) return null;

      const containerRect = contentRef.current.getBoundingClientRect();
      const firstRect = rects[0];

      return {
        top: firstRect.top - containerRect.top + contentRef.current.scrollTop,
        height: firstRect.height,
      };
    },
    [contentRef]
  );

  return { getCommentPosition };
}
