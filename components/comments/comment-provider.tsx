"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Comment, CommentFormData } from "./types";

interface CommentContextValue {
  comments: Comment[];
  activeCommentId: string | null;
  isCreating: boolean;
  setActiveCommentId: (id: string | null) => void;
  addComment: (data: CommentFormData) => Promise<Comment | null>;
  deleteComment: (commentId: string) => Promise<boolean>;
}

const CommentContext = createContext<CommentContextValue | null>(null);

interface CommentProviderProps {
  children: ReactNode;
  postSlug: string;
  initialComments: Comment[];
}

export function CommentProvider({
  children,
  postSlug,
  initialComments,
}: CommentProviderProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const addComment = useCallback(
    async (data: CommentFormData): Promise<Comment | null> => {
      setIsCreating(true);
      try {
        const response = await fetch(`/api/posts/${postSlug}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to create comment:", error);
          return null;
        }

        const { comment } = await response.json();
        setComments((prev) => [...prev, comment]);
        setActiveCommentId(comment.id);
        return comment;
      } catch (error) {
        console.error("Error creating comment:", error);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [postSlug]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/posts/${postSlug}/comments/${commentId}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to delete comment:", error);
          return false;
        }

        setComments((prev) => prev.filter((c) => c.id !== commentId));
        if (activeCommentId === commentId) {
          setActiveCommentId(null);
        }
        return true;
      } catch (error) {
        console.error("Error deleting comment:", error);
        return false;
      }
    },
    [postSlug, activeCommentId]
  );

  const value = useMemo(
    () => ({
      comments,
      activeCommentId,
      isCreating,
      setActiveCommentId,
      addComment,
      deleteComment,
    }),
    [comments, activeCommentId, isCreating, addComment, deleteComment]
  );

  return (
    <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
  );
}

export function useComments() {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error("useComments must be used within a CommentProvider");
  }
  return context;
}
