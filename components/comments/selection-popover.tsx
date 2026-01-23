"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentForm } from "./comment-form";
import { cn } from "@/lib/utils";
import type { XPathRange } from "@/lib/xpath";

interface SelectionPopoverProps {
  selection: {
    text: string;
    rect: DOMRect;
    xpathRange: XPathRange;
  } | null;
  isCreating: boolean;
  onAddComment: (content: string, xpathRange: XPathRange) => void;
  onCancel: () => void;
}

export function SelectionPopover({
  selection,
  isCreating,
  onAddComment,
  onCancel,
}: SelectionPopoverProps) {
  const [showForm, setShowForm] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 선택이 바뀌면 폼 닫기
  useEffect(() => {
    if (!selection) {
      setShowForm(false);
    }
  }, [selection]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onCancel();
      }
    };

    if (selection) {
      // 약간의 딜레이 후 리스너 등록 (선택 완료 시점의 mouseup과 충돌 방지)
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [selection, onCancel]);

  if (!selection) return null;

  // 팝오버 위치 계산
  const left = selection.rect.left + selection.rect.width / 2;
  // 버튼: 선택 영역 위에 표시, 폼: 선택 영역 아래에 표시
  const top = showForm
    ? selection.rect.bottom + window.scrollY + 8
    : selection.rect.top + window.scrollY - 8;

  const handleAddClick = () => {
    setShowForm(true);
  };

  const handleSubmit = (content: string) => {
    onAddComment(content, selection.xpathRange);
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    onCancel();
  };

  // 팝오버 내 클릭이 document로 전파되면 useTextSelection이 selection을 해제함
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={popoverRef}
      className={cn(
        "fixed z-50 -translate-x-1/2",
        !showForm && "-translate-y-full",
        "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
      style={{ top, left }}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
    >
      {showForm ? (
        <CommentForm
          selectedText={selection.text}
          isSubmitting={isCreating}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          className="w-72"
        />
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="shadow-lg"
          onClick={handleAddClick}
        >
          <MessageSquarePlus className="h-4 w-4 mr-1" />
          댓글 추가
        </Button>
      )}
    </div>
  );
}
