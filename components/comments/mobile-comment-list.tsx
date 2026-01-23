"use client";

import { MessageSquare } from "lucide-react";
import { CommentCard } from "./comment-card";
import { useComments } from "./comment-provider";
import { cn } from "@/lib/utils";

interface MobileCommentListProps {
  currentUserId: string | null;
  isAdmin: boolean;
  className?: string;
}

export function MobileCommentList({
  currentUserId,
  isAdmin,
  className,
}: MobileCommentListProps) {
  const { comments, activeCommentId, setActiveCommentId, deleteComment } =
    useComments();

  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId);
  };

  if (comments.length === 0) {
    return null; // 모바일에서 댓글이 없으면 숨김
  }

  return (
    <div className={cn("border-t pt-8", className)}>
      <h3 className="flex items-center gap-2 text-sm font-semibold mb-4">
        <MessageSquare className="h-4 w-4" />
        팀 댓글 ({comments.length})
      </h3>

      <div className="space-y-3">
        {comments.map((comment) => {
          const canDelete =
            currentUserId === comment.author.id || isAdmin;

          return (
            <CommentCard
              key={comment.id}
              comment={comment}
              isActive={activeCommentId === comment.id}
              canDelete={canDelete}
              onSelect={() =>
                setActiveCommentId(
                  activeCommentId === comment.id ? null : comment.id
                )
              }
              onDelete={() => handleDelete(comment.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
