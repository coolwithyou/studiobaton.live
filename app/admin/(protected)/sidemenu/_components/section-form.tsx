"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface Section {
  id: string;
  title: string;
  displayOrder: number;
  isActive: boolean;
}

interface SectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section?: Section;
  onSave: () => void;
}

export function SectionForm({
  open,
  onOpenChange,
  section,
  onSave,
}: SectionFormProps) {
  const isEditMode = !!section;

  const [title, setTitle] = useState(section?.title || "");
  const [isActive, setIsActive] = useState(section?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  // 다이얼로그가 열릴 때 값 초기화
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(section?.title || "");
      setIsActive(section?.isActive ?? true);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("섹션 제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const endpoint = "/api/admin/sidemenu/sections";
      const method = isEditMode ? "PUT" : "POST";
      const body = isEditMode
        ? { id: section!.id, title: title.trim(), isActive }
        : { title: title.trim(), isActive };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "저장 중 오류가 발생했습니다.");
        return;
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "섹션 수정" : "새 섹션 추가"}
          </DialogTitle>
          <DialogDescription>
            사이드 메뉴의 최상위 섹션을 {isEditMode ? "수정" : "추가"}합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">섹션 제목</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: ABOUT US"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="isActive">활성화</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
