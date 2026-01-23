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
      className={cn(
        "rounded-md border border-border/50 bg-background/95 backdrop-blur-sm p-2 shadow-sm",
        className
      )}
    >
      {/* 선택된 텍스트 표시 */}
      <div className="mb-1.5 text-[11px] text-muted-foreground/70 line-clamp-1 italic">
        &ldquo;{selectedText}&rdquo;
      </div>

      {/* 입력 영역 */}
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="댓글 입력..."
        className="min-h-[48px] resize-none text-sm border-0 bg-transparent p-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
        disabled={isSubmitting}
      />

      {/* 버튼 영역 */}
      <div className="flex items-center justify-end gap-1 mt-1.5 pt-1.5 border-t border-border/30">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={!content.trim() || isSubmitting}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}
