"use client";

import { useState } from "react";
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

interface CommentCardProps {
  comment: Comment;
  isActive: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => Promise<void>;
  className?: string;
}

export function CommentCard({
  comment,
  isActive,
  canDelete,
  onSelect,
  onDelete,
  className,
}: CommentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
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
      className={cn(
        "group rounded-lg border bg-card/60 p-3 transition-all cursor-pointer hover:bg-card/80",
        isActive && "ring-2 ring-primary/50 bg-card/80",
        className
      )}
      onClick={onSelect}
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
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
