"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditableTitleRoleProps {
  memberId: string;
  currentTitle: string | null;
  currentRole: string | null;
  canEdit: boolean;
}

export function EditableTitleRole({
  memberId,
  currentTitle,
  currentRole,
  canEdit,
}: EditableTitleRoleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle || "");
  const [role, setRole] = useState(currentRole || "");
  const [isPending, startTransition] = useTransition();

  const handleSave = async () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/member/title-role", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId,
            title: title.trim() || null,
            role: role.trim() || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "저장 실패");
        }

        toast.success("저장 완료", {
          description: "직함과 역할이 업데이트되었습니다.",
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
    setTitle(currentTitle || "");
    setRole(currentRole || "");
    setIsEditing(false);
  };

  // 편집 모드
  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">직함</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 시니어 개발자"
            maxLength={100}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">역할</Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="예: 프론트엔드 리드"
            maxLength={100}
            disabled={isPending}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            <X className="w-4 h-4 mr-1" />
            취소
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            저장
          </Button>
        </div>
      </div>
    );
  }

  // 보기 모드
  const hasContent = currentTitle || currentRole;

  return (
    <div className="group relative">
      {hasContent ? (
        <div className="space-y-1">
          {currentTitle && (
            <p className="text-muted-foreground">
              <span className="text-xs text-muted-foreground/70 mr-2">직함</span>
              {currentTitle}
            </p>
          )}
          {currentRole && (
            <p className="text-muted-foreground">
              <span className="text-xs text-muted-foreground/70 mr-2">역할</span>
              {currentRole}
            </p>
          )}
        </div>
      ) : (
        canEdit && (
          <p className="text-muted-foreground italic">
            직함과 역할을 입력해보세요.
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
