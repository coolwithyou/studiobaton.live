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
  // 폼이 열릴 때의 selection을 저장 (브라우저가 선택 해제해도 유지)
  const savedSelectionRef = useRef<SelectionPopoverProps["selection"]>(null);

  // 폼이 열려있지 않을 때만 selection 변경에 반응
  useEffect(() => {
    if (showForm) return; // 폼이 열려있을 때는 selection 변경 무시
    if (!selection) {
      setShowForm(false);
      savedSelectionRef.current = null;
    }
  }, [selection, showForm]);

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

    // 폼이 열려있거나 selection이 있을 때 외부 클릭 감지
    const activeSelection = showForm ? savedSelectionRef.current : selection;
    if (activeSelection) {
      // 약간의 딜레이 후 리스너 등록 (선택 완료 시점의 mouseup과 충돌 방지)
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [selection, showForm, onCancel]);

  // 폼이 열려있으면 저장된 selection 사용, 아니면 props의 selection 사용
  const activeSelection = showForm ? savedSelectionRef.current : selection;

  if (!activeSelection) return null;

  // 팝오버 위치 계산 (fixed 포지셔닝 = viewport 기준, getBoundingClientRect도 viewport 기준)
  const left = activeSelection.rect.left + activeSelection.rect.width / 2;
  // 버튼: 선택 영역 위에 표시, 폼: 선택 영역 아래에 표시
  const top = showForm
    ? activeSelection.rect.bottom + 8
    : activeSelection.rect.top - 8;

  const handleAddClick = () => {
    savedSelectionRef.current = selection;
    setShowForm(true);
  };

  const handleSubmit = (content: string) => {
    if (activeSelection) {
      onAddComment(content, activeSelection.xpathRange);
    }
    setShowForm(false);
    savedSelectionRef.current = null;
  };

  const handleCancel = () => {
    setShowForm(false);
    savedSelectionRef.current = null;
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
        !showForm && "-translate-y-full"
      )}
      style={{ top, left }}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
    >
      {showForm ? (
        <CommentForm
          selectedText={activeSelection.text}
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
