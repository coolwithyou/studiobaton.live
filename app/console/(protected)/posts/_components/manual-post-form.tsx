"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Send, Trash2, Zap, ImageIcon } from "lucide-react";
import { MarkdownGuideDialog } from "@/components/markdown/markdown-guide-dialog";
import { ImageUploader } from "@/components/ui/image-uploader";

const CONTENT_TYPE_NONE = "__none__";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContentTypeOption {
  id: string;
  slug: string;
  displayName: string;
}

interface ManualPostFormProps {
  post?: {
    id: string;
    title: string | null;
    content: string | null;
    summary: string | null;
    slug: string | null;
    contentTypeId: string | null;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    showInTimeline: boolean;
    thumbnailUrl: string | null;
  };
  contentTypes?: ContentTypeOption[];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[가-힣]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function ManualPostForm({ post, contentTypes = [] }: ManualPostFormProps) {
  const router = useRouter();
  const isEditMode = !!post;
  const selectId = useId();

  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [summary, setSummary] = useState(post?.summary || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [contentTypeId, setContentTypeId] = useState(post?.contentTypeId || CONTENT_TYPE_NONE);
  const [showInTimeline, setShowInTimeline] = useState(post?.showInTimeline ?? false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(post?.thumbnailUrl || null);
  const [mounted, setMounted] = useState(false);

  // Hydration 오류 방지를 위해 클라이언트에서만 Select 렌더링
  useEffect(() => {
    setMounted(true);
  }, []);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    post?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
  );

  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  // 제목이 변경되면 slug 자동 생성 (수동 편집하지 않은 경우만)
  useEffect(() => {
    if (!slugEdited && title && !isEditMode) {
      const generatedSlug = generateSlug(title);
      if (generatedSlug) {
        setSlug(generatedSlug);
      }
    }
  }, [title, slugEdited, isEditMode]);

  const handleSlugChange = (value: string) => {
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlug(sanitized);
    setSlugEdited(true);
  };

  const handleSubmit = async (publishStatus: "DRAFT" | "PUBLISHED") => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    if (!slug.trim()) {
      alert("URL slug를 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const finalContentTypeId = contentTypeId === CONTENT_TYPE_NONE ? undefined : contentTypeId;

      const endpoint = "/api/console/posts/manual";
      const method = isEditMode ? "PUT" : "POST";
      const body = isEditMode
        ? {
            id: post!.id,
            title: title.trim(),
            content: content.trim(),
            summary: summary.trim() || undefined,
            slug: slug.trim(),
            contentTypeId: finalContentTypeId,
            status: publishStatus,
            showInTimeline,
          }
        : {
            title: title.trim(),
            content: content.trim(),
            summary: summary.trim() || undefined,
            slug: slug.trim(),
            contentTypeId: finalContentTypeId,
            status: publishStatus,
            showInTimeline,
          };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "저장 중 오류가 발생했습니다.");
        return;
      }

      router.push("/console/posts");
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 빠른 저장 (리다이렉트 없이 현재 페이지 유지)
  const handleQuickSave = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    if (!slug.trim()) {
      alert("URL slug를 입력해주세요.");
      return;
    }

    setQuickSaving(true);
    try {
      const finalContentTypeId = contentTypeId === CONTENT_TYPE_NONE ? undefined : contentTypeId;

      const endpoint = "/api/console/posts/manual";
      const method = isEditMode ? "PUT" : "POST";
      const body = isEditMode
        ? {
            id: post!.id,
            title: title.trim(),
            content: content.trim(),
            summary: summary.trim() || undefined,
            slug: slug.trim(),
            contentTypeId: finalContentTypeId,
            status,
            showInTimeline,
          }
        : {
            title: title.trim(),
            content: content.trim(),
            summary: summary.trim() || undefined,
            slug: slug.trim(),
            contentTypeId: finalContentTypeId,
            status,
            showInTimeline,
          };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "저장 중 오류가 발생했습니다.");
        return;
      }

      // 새 글 작성 모드인 경우 수정 페이지로 이동
      if (!isEditMode && data.id) {
        router.replace(`/console/posts/${data.id}/edit`);
      }

      router.refresh();
    } catch (error) {
      console.error("Quick save error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setQuickSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post?.id) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/console/posts/manual?id=${post.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "삭제 중 오류가 발생했습니다.");
        return;
      }

      router.push("/console/posts");
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  // 현재 선택된 콘텐츠 타입 찾기 (URL 미리보기용)
  const selectedContentType = contentTypes.find((ct) => ct.id === contentTypeId);

  return (
    <div className="space-y-6">
      {/* 상태 표시 (편집 모드) */}
      {isEditMode && (
        <div className="flex items-center gap-2">
          <Badge variant={post.status === "PUBLISHED" ? "default" : "secondary"}>
            {post.status === "PUBLISHED" ? "발행됨" : "초안"}
          </Badge>
        </div>
      )}

      {/* 제목 */}
      <div className="space-y-2">
        <Label htmlFor="title">
          제목 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="포스트 제목을 입력하세요"
          className="text-lg"
        />
      </div>

      {/* URL Slug + 카테고리 (2열 레이아웃) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* URL Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">
            URL Slug <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              /{selectedContentType?.slug ?? "post"}/
            </span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="url-friendly-slug"
              className="font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.
          </p>
        </div>

        {/* 콘텐츠 타입 */}
        <div className="space-y-2">
          <Label htmlFor="contentType">콘텐츠 타입</Label>
          <div className="flex gap-2">
            {mounted ? (
              <Select key={selectId} value={contentTypeId} onValueChange={setContentTypeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="콘텐츠 타입 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CONTENT_TYPE_NONE}>없음</SelectItem>
                  {contentTypes.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="w-full h-10 rounded-md border bg-background" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedContentType
              ? `"${selectedContentType.displayName}" 목록에 표시됩니다.`
              : "선택하지 않으면 /post/ 경로에 표시됩니다."}
          </p>
        </div>
      </div>

      {/* 썸네일 이미지 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          목록 썸네일 이미지
        </Label>
        {isEditMode ? (
          <ImageUploader
            currentImageUrl={thumbnailUrl}
            uploadEndpoint="/api/upload/post-thumbnail"
            deleteEndpoint="/api/upload/post-thumbnail"
            uploadData={{ postId: post!.id }}
            aspectRatio="16:9"
            onUploadSuccess={(url) => setThumbnailUrl(url)}
            onDeleteSuccess={() => setThumbnailUrl(null)}
            onError={(message) => alert(message)}
            placeholder="썸네일 이미지 업로드 (16:9)"
            className="max-w-md"
          />
        ) : (
          <div className="max-w-md aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center px-4">
              포스트를 먼저 저장한 후 썸네일을 업로드할 수 있습니다.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          목록 페이지에 표시될 대표 이미지입니다. (권장: 1200x675px)
        </p>
      </div>

      {/* 요약 + 타임라인 노출 (2열 레이아웃) */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
        {/* 요약 */}
        <div className="space-y-2">
          <Label htmlFor="summary">요약</Label>
          <Textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="포스트 요약 (목록에 표시됩니다)"
            rows={2}
          />
        </div>

        {/* 타임라인 노출 */}
        <div className="space-y-2 md:pt-7">
          <div className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/30">
            <Checkbox
              id="showInTimeline"
              checked={showInTimeline}
              onCheckedChange={(checked) => setShowInTimeline(checked === true)}
            />
            <div className="grid gap-1 leading-none">
              <Label
                htmlFor="showInTimeline"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                타임라인에 노출
              </Label>
              <p className="text-xs text-muted-foreground">
                메인 페이지에 표시
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 내용 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">
            내용 <span className="text-red-500">*</span>
          </Label>
          <MarkdownGuideDialog />
        </div>
        <MarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="마크다운으로 내용을 작성하세요..."
          minHeight={1000}
        />
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex gap-2">
          {isEditMode && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="ml-2">삭제</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>포스트 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 포스트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={saving || quickSaving}
          >
            취소
          </Button>
          <Button
            variant="outline"
            onClick={handleQuickSave}
            disabled={saving || quickSaving}
          >
            {quickSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            <span className="ml-2">빠른 저장</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit("DRAFT")}
            disabled={saving || quickSaving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-2">초안 저장</span>
          </Button>
          <Button onClick={() => handleSubmit("PUBLISHED")} disabled={saving || quickSaving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-2">
              {isEditMode && post.status === "PUBLISHED" ? "저장하기" : "발행하기"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
