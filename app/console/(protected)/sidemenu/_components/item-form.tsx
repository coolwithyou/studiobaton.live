"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { LinkType } from "@/app/generated/prisma";

interface Section {
  id: string;
  title: string;
}

interface ContentType {
  id: string;
  slug: string;
  pluralSlug: string;
  displayName: string;
}

interface Item {
  id: string;
  sectionId: string;
  title: string;
  displayOrder: number;
  isActive: boolean;
  linkType: LinkType;
  internalPath: string | null;
  externalUrl: string | null;
  contentTypeId: string | null;
  postCategory: string | null;
  customSlug: string | null;
  activePattern: string | null;
}

interface ItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
  sections: Section[];
  defaultSectionId?: string;
  categories: string[];
  onSave: () => void;
}

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  INTERNAL: "내부 경로",
  EXTERNAL: "외부 링크",
  POST_CATEGORY: "포스트 카테고리",
};

export function ItemForm({
  open,
  onOpenChange,
  item,
  sections,
  defaultSectionId,
  categories,
  onSave,
}: ItemFormProps) {
  const isEditMode = !!item;

  const [sectionId, setSectionId] = useState("");
  const [title, setTitle] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [linkType, setLinkType] = useState<LinkType>("INTERNAL");
  const [internalPath, setInternalPath] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [contentTypeId, setContentTypeId] = useState("");
  const [activePattern, setActivePattern] = useState("");
  const [saving, setSaving] = useState(false);

  // ContentType 목록
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loadingContentTypes, setLoadingContentTypes] = useState(false);

  // ContentType 목록 로드
  useEffect(() => {
    if (open && linkType === "POST_CATEGORY") {
      setLoadingContentTypes(true);
      fetch("/api/console/content-types")
        .then((res) => res.json())
        .then((data) => {
          if (data.contentTypes) {
            setContentTypes(data.contentTypes);
          }
        })
        .catch((error) => {
          console.error("Failed to load content types:", error);
        })
        .finally(() => {
          setLoadingContentTypes(false);
        });
    }
  }, [open, linkType]);

  // item 또는 open이 변경될 때 폼 필드 동기화
  useEffect(() => {
    if (open) {
      setSectionId(item?.sectionId || defaultSectionId || "");
      setTitle(item?.title || "");
      setIsActive(item?.isActive ?? true);
      setLinkType(item?.linkType || "INTERNAL");
      setInternalPath(item?.internalPath || "");
      setExternalUrl(item?.externalUrl || "");
      setContentTypeId(item?.contentTypeId || "");
      setActivePattern(item?.activePattern || "");
    }
  }, [open, item, defaultSectionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sectionId) {
      alert("섹션을 선택해주세요.");
      return;
    }

    if (!title.trim()) {
      alert("메뉴 제목을 입력해주세요.");
      return;
    }

    // 링크 타입에 따른 필수 값 검증
    if (linkType === "INTERNAL" && !internalPath.trim()) {
      alert("내부 경로를 입력해주세요.");
      return;
    }

    if (linkType === "EXTERNAL" && !externalUrl.trim()) {
      alert("외부 URL을 입력해주세요.");
      return;
    }

    if (linkType === "POST_CATEGORY" && !contentTypeId) {
      alert("콘텐츠 타입을 선택해주세요.");
      return;
    }

    setSaving(true);
    try {
      const endpoint = "/api/console/sidemenu/items";
      const method = isEditMode ? "PUT" : "POST";

      const body = isEditMode
        ? {
            id: item!.id,
            sectionId,
            title: title.trim(),
            isActive,
            linkType,
            internalPath: linkType === "INTERNAL" ? internalPath.trim() : null,
            externalUrl: linkType === "EXTERNAL" ? externalUrl.trim() : null,
            contentTypeId: linkType === "POST_CATEGORY" ? contentTypeId : null,
            activePattern:
              linkType === "INTERNAL" && activePattern.trim()
                ? activePattern.trim()
                : null,
          }
        : {
            sectionId,
            title: title.trim(),
            isActive,
            linkType,
            internalPath: linkType === "INTERNAL" ? internalPath.trim() : undefined,
            externalUrl: linkType === "EXTERNAL" ? externalUrl.trim() : undefined,
            contentTypeId: linkType === "POST_CATEGORY" ? contentTypeId : undefined,
            activePattern:
              linkType === "INTERNAL" && activePattern.trim()
                ? activePattern.trim()
                : undefined,
          };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "메뉴 아이템 수정" : "새 메뉴 아이템 추가"}
          </DialogTitle>
          <DialogDescription>
            사이드 메뉴의 하위 아이템을 {isEditMode ? "수정" : "추가"}합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section">섹션</Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="섹션 선택" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">메뉴 제목</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: BATON DEV"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkType">링크 타입</Label>
              <Select
                value={linkType}
                onValueChange={(v) => setLinkType(v as LinkType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LINK_TYPE_LABELS) as LinkType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {LINK_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {linkType === "INTERNAL" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="internalPath">내부 경로</Label>
                  <Input
                    id="internalPath"
                    value={internalPath}
                    onChange={(e) => setInternalPath(e.target.value)}
                    placeholder="/members"
                  />
                  <p className="text-xs text-muted-foreground">
                    사이트 내부 페이지 경로를 입력하세요.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activePattern">활성화 패턴 (선택)</Label>
                  <Input
                    id="activePattern"
                    value={activePattern}
                    onChange={(e) => setActivePattern(e.target.value)}
                    placeholder="^/$|^/post/"
                  />
                  <p className="text-xs text-muted-foreground">
                    정규표현식으로 활성화 URL을 지정합니다. 비워두면 내부 경로와
                    정확히 일치할 때만 활성화됩니다.
                  </p>
                </div>
              </>
            )}

            {linkType === "EXTERNAL" && (
              <div className="space-y-2">
                <Label htmlFor="externalUrl">외부 URL</Label>
                <Input
                  id="externalUrl"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.com"
                />
                <p className="text-xs text-muted-foreground">
                  외부 링크 URL을 입력하세요. (새 탭에서 열립니다)
                </p>
              </div>
            )}

            {linkType === "POST_CATEGORY" && (
              <div className="space-y-2">
                <Label htmlFor="contentTypeId">콘텐츠 타입</Label>
                <Select value={contentTypeId} onValueChange={setContentTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingContentTypes ? "로딩 중..." : "콘텐츠 타입 선택"} />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.displayName} (/{ct.pluralSlug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contentTypes.length === 0 && !loadingContentTypes && (
                  <p className="text-xs text-amber-600">
                    등록된 콘텐츠 타입이 없습니다. 먼저 콘텐츠 타입을 추가해주세요.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  선택한 콘텐츠 타입의 포스트 목록 페이지로 연결됩니다.
                </p>
              </div>
            )}

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
