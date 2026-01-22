"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContentType {
  id: string;
  slug: string;
  pluralSlug: string;
  displayName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  _count: {
    posts: number;
    menuItems: number;
  };
}

interface ContentTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType?: ContentType;
  onSave: () => void;
}

export function ContentTypeForm({
  open,
  onOpenChange,
  contentType,
  onSave,
}: ContentTypeFormProps) {
  const isEditing = !!contentType;

  const [formData, setFormData] = useState({
    slug: "",
    pluralSlug: "",
    displayName: "",
    description: "",
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contentType) {
      setFormData({
        slug: contentType.slug,
        pluralSlug: contentType.pluralSlug,
        displayName: contentType.displayName,
        description: contentType.description || "",
        isActive: contentType.isActive,
      });
    } else {
      setFormData({
        slug: "",
        pluralSlug: "",
        displayName: "",
        description: "",
        isActive: true,
      });
    }
    setErrors({});
  }, [contentType, open]);

  // 표시명 입력 시 자동으로 slug 생성 (새 콘텐츠 타입일 때만)
  const handleDisplayNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      displayName: value,
    }));
  };

  // slug 변경 시 pluralSlug 자동 생성
  const handleSlugChange = (value: string) => {
    const normalizedSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setFormData((prev) => ({
      ...prev,
      slug: normalizedSlug,
      // 복수형 자동 생성 (간단한 규칙)
      pluralSlug: prev.pluralSlug === "" || prev.pluralSlug === prev.slug + "s"
        ? normalizedSlug + "s"
        : prev.pluralSlug,
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.slug.trim()) {
      newErrors.slug = "슬러그를 입력해주세요.";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = "영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.";
    }

    if (!formData.pluralSlug.trim()) {
      newErrors.pluralSlug = "복수형 슬러그를 입력해주세요.";
    } else if (!/^[a-z0-9-]+$/.test(formData.pluralSlug)) {
      newErrors.pluralSlug = "영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.";
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = "표시명을 입력해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const url = "/api/console/content-types";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? { id: contentType.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onSave();
        onOpenChange(false);
      } else {
        const data = await response.json();
        if (data.details) {
          // Zod 에러
          const zodErrors: Record<string, string> = {};
          for (const [key, messages] of Object.entries(data.details)) {
            zodErrors[key] = (messages as string[])[0];
          }
          setErrors(zodErrors);
        } else {
          setErrors({ _root: data.error || "저장 중 오류가 발생했습니다." });
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      setErrors({ _root: "저장 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "콘텐츠 타입 수정" : "새 콘텐츠 타입"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "콘텐츠 타입 정보를 수정합니다."
              : "새로운 콘텐츠 타입을 추가합니다. 추가 후 URL이 자동으로 생성됩니다."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors._root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors._root}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">표시명 *</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="예: 개발 로그"
            />
            {errors.displayName && (
              <p className="text-sm text-destructive">{errors.displayName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">슬러그 (단수형) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="예: log"
              />
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug}</p>
              )}
              <p className="text-xs text-muted-foreground">
                영문 소문자, 숫자, 하이픈만 사용
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pluralSlug">URL 슬러그 (복수형) *</Label>
              <Input
                id="pluralSlug"
                value={formData.pluralSlug}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pluralSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  }))
                }
                placeholder="예: logs"
              />
              {errors.pluralSlug && (
                <p className="text-sm text-destructive">{errors.pluralSlug}</p>
              )}
              <p className="text-xs text-muted-foreground">
                목록 페이지 URL: /{formData.pluralSlug || "..."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명 (선택)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="이 콘텐츠 타입에 대한 간단한 설명"
              rows={2}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked === true }))
              }
            />
            <Label htmlFor="isActive">활성화</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : isEditing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
