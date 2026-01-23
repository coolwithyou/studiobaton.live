"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
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
  const [isMouseInside, setIsMouseInside] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canDelete =
    comment && (isAdmin || comment.author.id === currentUserId);

  // 팝오버 위치 계산
  const getPopoverStyle = useCallback(() => {
    if (!position) return { display: "none" as const };

    const POPOVER_WIDTH = 320;
    const POPOVER_HEIGHT_ESTIMATE = 150;
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
    setIsMouseInside(false);
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // 마우스가 팝오버 안으로 들어오면 타임아웃 취소
  const handleMouseEnter = useCallback(() => {
    setIsMouseInside(true);
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
      className={cn(
        "rounded-lg border bg-popover/95 backdrop-blur-sm p-3 shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 선택된 텍스트 인용 */}
      <div className="mb-2 px-2 py-1 bg-yellow-100/50 dark:bg-yellow-900/20 rounded text-xs text-muted-foreground border-l-2 border-yellow-400 line-clamp-2">
        &ldquo;{comment.selectedText}&rdquo;
      </div>

      {/* 작성자 정보 */}
      <div className="flex items-start gap-2">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage
            src={comment.author.avatarUrl || undefined}
            alt={comment.author.name}
          />
          <AvatarFallback className="text-[10px]">
            {comment.author.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium truncate">
              {comment.author.name}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {timeAgo}
            </span>
          </div>

          {/* 댓글 내용 */}
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>

        {/* 삭제 버튼 */}
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
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
