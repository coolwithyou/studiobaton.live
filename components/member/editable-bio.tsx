"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EditableBioProps {
  memberId: string;
  currentBio: string | null;
  canEdit: boolean;
}

export function EditableBio({ memberId, currentBio, canEdit }: EditableBioProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(currentBio || "");
  // 저장된 값을 추적하여 즉시 UI 반영
  const [savedBio, setSavedBio] = useState(currentBio);
  const [isPending, startTransition] = useTransition();

  const handleSave = async () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/member/bio", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, bio: bio.trim() }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "저장 실패");
        }

        const data = await response.json();
        // 저장된 값 업데이트하여 즉시 UI 반영
        setSavedBio(data.bio);

        toast.success("저장 완료", {
          description: "자기소개가 업데이트되었습니다.",
        });
        setIsEditing(false);
      } catch (error) {
        toast.error("저장 실패", {
          description: error instanceof Error ? error.message : "알 수 없는 오류",
        });
      }
    });
  };

  const handleCancel = () => {
    setBio(savedBio || "");
    setIsEditing(false);
  };

  // 편집 모드
  if (isEditing) {
    return (
      <div className="space-y-3">
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="자기소개를 입력하세요..."
          rows={4}
          maxLength={5000}
          className="resize-none"
          disabled={isPending}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {bio.length} / 5,000
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isPending}
            >
              <X className="w-4 h-4 mr-1" />
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              저장
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 보기 모드 - savedBio 사용하여 저장 후 즉시 반영
  return (
    <div className="group relative">
      {savedBio ? (
        <p className="text-muted-foreground whitespace-pre-wrap">{savedBio}</p>
      ) : (
        canEdit && (
          <p className="text-muted-foreground italic">
            자기소개를 작성해보세요.
          </p>
        )
      )}
      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
