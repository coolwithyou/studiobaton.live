"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MentionAutocomplete } from "./mention-autocomplete";
import { Plus, Loader2 } from "lucide-react";

interface StandupFormProps {
  date: Date;
  memberId: string;
  onTaskAdded: () => void;
}

export function StandupForm({ date, memberId, onTaskAdded }: StandupFormProps) {
  const [content, setContent] = useState("");
  const [repository, setRepository] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mentionPopupOpen, setMentionPopupOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 동기적 중복 제출 방지
    if (submittingRef.current) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await fetch("/api/console/standup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          memberId,
          content: trimmedContent,
          repository,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add task");
      }

      setContent("");
      setRepository(null);
      onTaskAdded();
    } catch (error) {
      console.error("Failed to add task:", error);
      alert(error instanceof Error ? error.message : "할 일 추가에 실패했습니다.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRepositorySelect = (repo: string) => {
    setRepository(repo);
  };

  // Enter로 제출 (Shift+Enter는 줄바꿈)
  // mention 팝업이 열려있으면 Enter는 repo 선택용으로 사용
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // IME 조합 중일 때는 무시 (한글 등)
    if (e.nativeEvent.isComposing) return;

    // 1차 방어: mention 팝업 열려있으면 Enter는 mention-autocomplete가 처리
    if (mentionPopupOpen) return;

    // 2차 방어: 이미 처리된 이벤트는 무시
    if (e.defaultPrevented) return;

    // 팝업 닫혀있을 때: Enter로 submit, Shift+Enter로 줄바꿈
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (content.trim()) {
        handleSubmit(e);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div onKeyDown={handleKeyDown}>
        <MentionAutocomplete
          value={content}
          onChange={setContent}
          onRepositorySelect={handleRepositorySelect}
          onOpenChange={setMentionPopupOpen}
          inputRef={inputRef}
        />
      </div>

      {repository && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>연결된 레포:</span>
          <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
            @{repository}
          </code>
          <button
            type="button"
            onClick={() => setRepository(null)}
            className="text-xs text-destructive hover:underline"
          >
            제거
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!content.trim() || submitting} size="sm">
          {submitting ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Plus className="size-4 mr-2" />
          )}
          할 일 추가
        </Button>
      </div>
    </form>
  );
}
