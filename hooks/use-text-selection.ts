"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSelectionXPathRange, type XPathRange } from "@/lib/xpath";

interface SelectionData {
  text: string;
  rect: DOMRect;
  xpathRange: XPathRange;
}

/**
 * 텍스트 선택 감지 훅
 * 콘텐츠 영역 내에서 텍스트 드래그 시 XPath 범위와 위치 정보 반환
 */
export function useTextSelection(
  contentRef: React.RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const isSelecting = useRef(false);

  const handleMouseDown = useCallback(() => {
    isSelecting.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!enabled || !contentRef.current || !isSelecting.current) {
      setSelection(null);
      isSelecting.current = false;
      return;
    }

    isSelecting.current = false;

    // 약간의 딜레이로 Selection API가 업데이트될 시간 확보
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelection(null);
        return;
      }

      // 선택이 콘텐츠 영역 내에 있는지 확인
      const range = sel.getRangeAt(0);
      if (!contentRef.current?.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }

      // XPath 범위 추출
      const xpathRange = getSelectionXPathRange(sel, contentRef.current);
      if (!xpathRange || !xpathRange.selectedText) {
        setSelection(null);
        return;
      }

      // 선택 영역의 위치 정보
      const rect = range.getBoundingClientRect();

      setSelection({
        text: xpathRange.selectedText,
        rect,
        xpathRange,
      });
    });
  }, [enabled, contentRef]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSelection(null);
      return;
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [enabled, handleMouseDown, handleMouseUp]);

  return { selection, clearSelection };
}
