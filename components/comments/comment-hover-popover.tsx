"use client";

import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  isLocked?: boolean; // 클릭으로 고정된 상태
  onClose: () => void;
  onDelete: (commentId: string) => Promise<boolean>;
}

export const CommentHoverPopover = forwardRef<HTMLDivElement, CommentHoverPopoverProps>(
  function CommentHoverPopover(
    { comment, position, currentUserId, isAdmin, isLocked = false, onClose, onDelete },
    ref
  ) {
    const [isDeleting, setIsDeleting] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canDelete =
    comment && (isAdmin || comment.author.id === currentUserId);

  // 팝오버 위치 계산 - 하이라이트 바로 아래에 표시
  const getPopoverStyle = useCallback(() => {
    if (!position) return { display: "none" as const };

    const POPOVER_WIDTH = 280;
    const OFFSET = 8; // 하이라이트와의 간격

    let x = position.x - POPOVER_WIDTH / 2;
    // 하이라이트 바로 아래에 표시 (position.y는 하이라이트 상단, 약 20px 아래가 하이라이트 하단)
    let y = position.y + 24 + OFFSET;

    // 화면 왼쪽 경계
    if (x < 8) x = 8;
    // 화면 오른쪽 경계
    if (x + POPOVER_WIDTH > window.innerWidth - 8) {
      x = window.innerWidth - POPOVER_WIDTH - 8;
    }
    // 화면 하단 경계 - 위쪽에 표시
    if (y + 100 > window.innerHeight) {
      y = position.y - 100 - OFFSET;
    }

    return {
      position: "fixed" as const,
      left: `${x}px`,
      top: `${y}px`,
      width: `${POPOVER_WIDTH}px`,
      zIndex: 50,
    };
  }, [position]);

  // 마우스가 팝오버 밖으로 나갔을 때 딜레이 후 닫기 (고정 상태가 아닐 때만)
  const handleMouseLeave = useCallback(() => {
    if (isLocked) return; // 클릭으로 고정된 상태면 자동 닫기 안함
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose, isLocked]);

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
      ref={ref}
      style={getPopoverStyle()}
      className="bg-background/98 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-border/40 p-3"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 작성자 + 댓글 내용 */}
      <div className="flex gap-2.5">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage
            src={comment.author.avatarUrl || undefined}
            alt={comment.author.name}
          />
          <AvatarFallback className="text-[10px] bg-muted">
            {comment.author.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* 작성자 + 시간 */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[12px] font-medium text-foreground/80">
              {comment.author.name}
            </span>
            <span className="text-[11px] text-muted-foreground/60">
              {timeAgo}
            </span>
          </div>

          {/* 댓글 내용 */}
          <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>

        {/* 삭제 버튼 */}
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="p-1.5 -mt-0.5 -mr-1 rounded-md hover:bg-muted/80 transition-colors self-start"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-destructive" />
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
});
