"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { restoreCommentRange, type XPathRange } from "@/lib/xpath";

export interface CommentHighlight extends XPathRange {
  id: string;
}

export interface HoveredComment {
  id: string;
  position: { x: number; y: number };
  comment: CommentHighlight;
}

// CSS Custom Highlight API 스타일 (동적 주입) - 밑줄 스타일
const HIGHLIGHT_STYLES = `
::highlight(comment) {
  text-decoration: underline wavy;
  text-decoration-color: rgba(234, 179, 8, 0.6);
  text-underline-offset: 3px;
  cursor: pointer;
}
::highlight(comment-active) {
  text-decoration: underline wavy;
  text-decoration-color: rgba(234, 179, 8, 1);
  text-underline-offset: 3px;
  cursor: pointer;
}
.dark ::highlight(comment) {
  text-decoration-color: rgba(250, 204, 21, 0.5);
}
.dark ::highlight(comment-active) {
  text-decoration-color: rgba(250, 204, 21, 0.9);
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

// 간단한 throttle 함수
function throttle<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
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
  const [hoveredComment, setHoveredComment] = useState<HoveredComment | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // 마운트 후 DOM이 준비되면 하이라이트 적용
  useEffect(() => {
    // 약간의 딜레이로 hydration 완료 대기
    const timer = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  // 좌표가 rect 내에 있는지 확인
  const isPointInRect = (x: number, y: number, rect: DOMRect): boolean => {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };

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
          if (isPointInRect(x, y, rect)) {
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

  // 호버 핸들러 (throttled) - 고정된 위치 사용
  const handleMouseMove = useCallback(
    throttle((event: MouseEvent) => {
      if (!contentRef.current) return;

      const x = event.clientX;
      const y = event.clientY;

      // 하이라이트 영역 위에 있는지 확인
      for (const [commentId, range] of rangeMapRef.current) {
        const rects = range.getClientRects();
        for (const rect of rects) {
          if (isPointInRect(x, y, rect)) {
            const comment = comments.find((c) => c.id === commentId);
            if (comment) {
              // 타임아웃 클리어
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }

              // 이미 같은 댓글이 호버되어 있으면 position 업데이트하지 않음
              setHoveredComment((prev) => {
                if (prev?.id === commentId) {
                  return prev; // 기존 position 유지
                }

                // 새로운 댓글이면 첫 번째 rect의 중심점으로 고정
                const firstRect = rects[0];
                const fixedX = firstRect.left + firstRect.width / 2;
                const fixedY = firstRect.top;

                return {
                  id: commentId,
                  position: { x: fixedX, y: fixedY },
                  comment,
                };
              });
            }
            return;
          }
        }
      }

      // 하이라이트 영역 밖으로 나가면 딜레이 후 닫기 (팝오버 접근 시간 확보)
      if (hoveredComment && !hoverTimeoutRef.current) {
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredComment(null);
          hoverTimeoutRef.current = null;
        }, 300);
      }
    }, 16), // 60fps
    [contentRef, comments, hoveredComment]
  );

  // 호버 클리어 함수
  const clearHover = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredComment(null);
  }, []);

  // 하이라이트 업데이트
  useEffect(() => {
    // 마운트 전이거나 contentRef가 없으면 스킵
    if (!isMounted || !contentRef.current) return;

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
  }, [comments, contentRef, activeCommentId, isMounted]);

  // 클릭 및 마우스 이벤트 리스너
  useEffect(() => {
    if (!contentRef.current) return;

    const content = contentRef.current;

    if (onCommentClick) {
      content.addEventListener("click", handleHighlightClick);
    }
    content.addEventListener("mousemove", handleMouseMove);
    content.addEventListener("mouseleave", clearHover);

    return () => {
      if (onCommentClick) {
        content.removeEventListener("click", handleHighlightClick);
      }
      content.removeEventListener("mousemove", handleMouseMove);
      content.removeEventListener("mouseleave", clearHover);

      // 클린업 시 타임아웃 정리
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [contentRef, onCommentClick, handleHighlightClick, handleMouseMove, clearHover]);

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

  return { getCommentPosition, hoveredComment, clearHover };
}
