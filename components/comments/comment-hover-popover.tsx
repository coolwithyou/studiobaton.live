"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Comment } from "./types";

interface CommentHoverPopoverProps {
  comment: Comment | null;
  position: { x: number; y: number } | null;
  currentUserId: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onDelete: (commentId: string) => Promise<boolean>;
}

export function CommentHoverPopover({
  comment,
  position,
  currentUserId,
  isAdmin,
  onClose,
  onDelete,
}: CommentHoverPopoverProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canDelete =
    comment && (isAdmin || comment.author.id === currentUserId);

  // 팝오버 위치 계산
  const getPopoverStyle = useCallback(() => {
    if (!position) return { display: "none" as const };

    const POPOVER_WIDTH = 300;
    const POPOVER_HEIGHT_ESTIMATE = 140;
    const OFFSET = 12;

    let x = position.x - POPOVER_WIDTH / 2;
    let y = position.y - POPOVER_HEIGHT_ESTIMATE - OFFSET;

    // 화면 왼쪽 경계
    if (x < 8) x = 8;
    // 화면 오른쪽 경계
    if (x + POPOVER_WIDTH > window.innerWidth - 8) {
      x = window.innerWidth - POPOVER_WIDTH - 8;
    }
    // 화면 상단 경계 - 아래쪽에 표시
    if (y < 8) {
      y = position.y + OFFSET;
    }

    return {
      position: "fixed" as const,
      left: `${x}px`,
      top: `${y}px`,
      width: `${POPOVER_WIDTH}px`,
      zIndex: 50,
    };
  }, [position]);

  // 마우스가 팝오버 밖으로 나갔을 때 딜레이 후 닫기
  const handleMouseLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // 마우스가 팝오버 안으로 들어오면 타임아웃 취소
  const handleMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // 클린업
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // 댓글이 없거나 위치가 없으면 렌더링하지 않음
  if (!comment || !position) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div
      ref={popoverRef}
      style={getPopoverStyle()}
      className="bg-background/98 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-border/40 p-3"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 댓글 내용 */}
      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
        {comment.content}
      </p>

      {/* 메타 정보 (작성자 + 시간 + 삭제) */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">
            {comment.author.name}
          </span>
          <span className="opacity-40">·</span>
          <span>{timeAgo}</span>
        </div>

        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="p-1 -m-1 rounded hover:bg-muted/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground/60 hover:text-destructive" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
