"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CommentFormProps {
  selectedText: string;
  isSubmitting: boolean;
  onSubmit: (content: string) => void;
  onCancel: () => void;
  className?: string;
}

export function CommentForm({
  selectedText,
  isSubmitting,
  onSubmit,
  onCancel,
  className,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 자동 포커스
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    onSubmit(content.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("rounded-lg border bg-card p-3 shadow-lg", className)}
    >
      {/* 선택된 텍스트 표시 */}
      <div className="mb-2 px-2 py-1 bg-yellow-100/50 dark:bg-yellow-900/20 rounded text-xs text-muted-foreground border-l-2 border-yellow-400 line-clamp-2">
        &ldquo;{selectedText}&rdquo;
      </div>

      {/* 입력 영역 */}
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="댓글을 입력하세요..."
        className="min-h-[60px] resize-none text-sm"
        disabled={isSubmitting}
      />

      {/* 버튼 영역 */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">
          ⌘ + Enter로 제출
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || isSubmitting}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
