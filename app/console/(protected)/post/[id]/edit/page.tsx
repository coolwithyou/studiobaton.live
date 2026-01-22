"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { MarkdownGuideDialog } from "@/components/markdown/markdown-guide-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatKST } from "@/lib/date-utils";
import { Loader2, Plus, RefreshCw, Trash2, Zap, ImageIcon } from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";
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
import { PageContainer } from "@/components/admin/ui/page-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_MODELS, AIModel, DEFAULT_MODEL, estimateCost, formatCost } from "@/lib/ai-models";

const CATEGORY_NONE = "__none__";
const CATEGORY_CUSTOM = "__custom__";

interface PostVersion {
  id: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  suggestedSlug: string | null;
  tone: "PROFESSIONAL" | "CASUAL" | "TECHNICAL";
  isSelected: boolean;
}

interface Commit {
  id: string;
  sha: string;
  repository: string;
  message: string;
  author: string;
  authorAvatar: string | null;
  additions: number;
  deletions: number;
  url: string;
  committedAt: string;
}

interface RepositoryMapping {
  repositoryName: string;
  displayName: string;
}

interface Post {
  id: string;
  targetDate: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  type: "COMMIT_BASED" | "MANUAL";
  title: string | null;
  content: string | null;
  summary: string | null;
  slug: string | null;
  category: string | null;
  showInTimeline: boolean;
  thumbnailUrl: string | null;
  versions: PostVersion[];
  commits: Commit[];
  repositoryMappings: RepositoryMapping[];
  contentType?: {
    slug: string;
    pluralSlug: string;
  } | null;
}

const TONE_LABELS: Record<string, string> = {
  PROFESSIONAL: "전문적",
  CASUAL: "캐주얼",
  TECHNICAL: "기술적",
};

export default function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [slug, setSlug] = useState("");
  const [generatingTone, setGeneratingTone] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);
  const [category, setCategory] = useState<string>(CATEGORY_NONE);
  const [customCategory, setCustomCategory] = useState("");
  const [showInTimeline, setShowInTimeline] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchPost();
    fetchCategories();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/console/posts/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/console/posts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPost(data);

      // 기본값 설정
      setThumbnailUrl(data.thumbnailUrl || null);
      if (data.status === "PUBLISHED") {
        setTitle(data.title || "");
        setContent(data.content || "");
        setSummary(data.summary || "");
        setSlug(data.slug || "");
        setCategory(data.category || CATEGORY_NONE);
        setShowInTimeline(data.showInTimeline ?? false);
      } else if (data.versions.length > 0) {
        const firstVersion = data.versions[0];
        setSelectedVersionId(firstVersion.id);
        setTitle(firstVersion.title);
        setContent(firstVersion.content);
        setSummary(firstVersion.summary || "");
        setSlug(firstVersion.suggestedSlug || "");
      }
    } catch (error) {
      console.error("Error fetching post:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (version: PostVersion) => {
    setSelectedVersionId(version.id);
    setTitle(version.title);
    setContent(version.content);
    setSummary(version.summary || "");
    setSlug(version.suggestedSlug || "");
  };

  const handleCancel = () => {
    router.push(`/console/post/${id}`);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    const finalCategory = category === CATEGORY_CUSTOM
      ? customCategory
      : category === CATEGORY_NONE
        ? undefined
        : category;

    setSaving(true);
    try {
      const res = await fetch(`/api/console/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          summary,
          slug,
          category: finalCategory,
          showInTimeline,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      router.push(`/console/post/${id}`);
      router.refresh();
    } catch (error) {
      console.error("Error saving:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 빠른 저장 (리다이렉트 없이 현재 페이지 유지)
  const handleQuickSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    const finalCategory = category === CATEGORY_CUSTOM
      ? customCategory
      : category === CATEGORY_NONE
        ? undefined
        : category;

    setQuickSaving(true);
    try {
      const res = await fetch(`/api/console/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          summary,
          slug,
          category: finalCategory,
          showInTimeline,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "저장 중 오류가 발생했습니다.");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Error quick saving:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setQuickSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    const finalCategory = category === CATEGORY_CUSTOM
      ? customCategory
      : category === CATEGORY_NONE
        ? undefined
        : category;

    setSaving(true);
    try {
      const res = await fetch(`/api/console/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          summary,
          slug,
          category: finalCategory,
          showInTimeline,
          action: "publish",
          versionId: selectedVersionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "발행 중 오류가 발생했습니다.");
        return;
      }

      router.push(`/console/post/${id}`);
      router.refresh();
    } catch (error) {
      console.error("Error publishing:", error);
      alert("발행 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm("정말 발행을 취소하시겠습니까?\n\n발행 취소 시 공개 페이지에서 더 이상 볼 수 없게 됩니다.")) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/console/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          summary,
          action: "unpublish",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "발행 취소 중 오류가 발생했습니다.");
        return;
      }

      await fetchPost();
    } catch (error) {
      console.error("Error unpublishing:", error);
      alert("발행 취소 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/console/posts/${id}`, {
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

  const handleGenerateVersion = async (
    tone: "PROFESSIONAL" | "CASUAL" | "TECHNICAL",
    forceRegenerate: boolean = false
  ) => {
    setGeneratingTone(tone);
    try {
      const res = await fetch(`/api/console/posts/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, forceRegenerate, model: selectedModel }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "버전 생성 중 오류가 발생했습니다.");
        return;
      }

      // 새로 생성된 버전으로 데이터 새로고침
      await fetchPost();

      // 새로 생성된 버전 선택
      if (data.versionId) {
        setSelectedVersionId(data.versionId);
      }
    } catch (error) {
      console.error("Error generating version:", error);
      alert("버전 생성 중 오류가 발생했습니다.");
    } finally {
      setGeneratingTone(null);
    }
  };

  const handleRegenerateVersion = async (tone: "PROFESSIONAL" | "CASUAL" | "TECHNICAL") => {
    if (!confirm(`${TONE_LABELS[tone]} 버전을 재생성하시겠습니까?\n\n기존 내용이 삭제되고 새로운 내용으로 대체됩니다.`)) {
      return;
    }
    await handleGenerateVersion(tone, true);
  };

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-32 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!post) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p>포스트를 찾을 수 없습니다.</p>
          <Button onClick={() => router.push("/console")} className="mt-4">
            돌아가기
          </Button>
        </div>
      </PageContainer>
    );
  }

  const isPublished = post.status === "PUBLISHED";

  // 리포지토리명 → displayName 매핑
  const repoDisplayNameMap = new Map(
    post.repositoryMappings.map((m) => [m.repositoryName, m.displayName])
  );

  // 커밋에서 사용된 고유 리포지토리 목록
  const usedRepositories = [...new Set(post.commits.map((c) => c.repository))];

  return (
    <PageContainer>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/console/post/${id}`)}
            >
              ← 돌아가기
            </Button>
            <Badge variant={isPublished ? "default" : "secondary"}>
              {isPublished ? "발행됨" : "대기중"}
            </Badge>
            <Badge variant="outline">수정 모드</Badge>
          </div>
          <h1 className="text-2xl font-bold">
            {formatKST(post.targetDate, "yyyy년 M월 d일")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {post.commits.length}개의 커밋
          </p>
        </div>
        <div className="flex gap-2">
          {!isPublished && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={saving || deleting}>
                    {deleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>포스트 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      {title ? (
                        <>
                          &quot;{title}&quot; 포스트를 삭제하시겠습니까?
                        </>
                      ) : (
                        "이 포스트를 삭제하시겠습니까?"
                      )}
                      <br />
                      이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" onClick={handleCancel} disabled={saving || quickSaving || deleting}>
                취소
              </Button>
              <Button variant="outline" onClick={handleQuickSave} disabled={saving || quickSaving || deleting}>
                {quickSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                빠른 저장
              </Button>
              <Button onClick={handlePublish} disabled={saving || quickSaving || deleting}>
                {saving ? "발행 중..." : "발행하기"}
              </Button>
            </>
          )}
          {isPublished && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={saving || deleting}>
                    {deleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>포스트 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      {title ? (
                        <>
                          &quot;{title}&quot; 포스트를 삭제하시겠습니까?
                        </>
                      ) : (
                        "이 포스트를 삭제하시겠습니까?"
                      )}
                      <br />
                      이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" onClick={handleUnpublish} disabled={saving || quickSaving || deleting}>
                발행 취소
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving || quickSaving || deleting}>
                취소
              </Button>
              <Button variant="outline" onClick={handleQuickSave} disabled={saving || quickSaving || deleting}>
                {quickSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                빠른 저장
              </Button>
              <Button onClick={handleSave} disabled={saving || quickSaving || deleting}>
                {saving ? "저장 중..." : "저장하기"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* 좌측: 리포지토리 목록 */}
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold mb-3">사용된 리포지토리</h3>
            <ul className="space-y-3">
              {usedRepositories.map((repo) => {
                const displayName = repoDisplayNameMap.get(repo);
                return (
                  <li key={repo} className="text-sm">
                    <div className="font-medium">
                      {displayName || repo}
                    </div>
                    {displayName && (
                      <div className="text-muted-foreground font-mono text-xs">
                        {repo}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 우측: 수정 폼 */}
        <div className="min-w-0">
          {/* 버전 선택 탭 */}
          {post.versions.length > 0 && (
            <Tabs
              value={selectedVersionId || post.versions[0].id}
              onValueChange={(v) => {
                const version = post.versions.find((ver) => ver.id === v);
                if (version) handleVersionSelect(version);
              }}
              className="mb-4"
            >
              <TabsList>
                {post.versions.map((version) => (
                  <TabsTrigger key={version.id} value={version.id}>
                    {TONE_LABELS[version.tone]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* 버전 관리 버튼 */}
          {!isPublished && post.commits.length > 0 && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-sm text-muted-foreground">버전 관리:</span>
              <Select
                value={selectedModel}
                onValueChange={(value) => setSelectedModel(value as AIModel)}
                disabled={generatingTone !== null}
              >
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AVAILABLE_MODELS).map(([key, label]) => {
                    const cost = post.commits.length > 0 ? estimateCost(post.commits.length, key as AIModel) : null;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span>{label}</span>
                          {cost && (
                            <span className="text-xs text-muted-foreground">
                              {formatCost(cost)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {(["PROFESSIONAL", "CASUAL", "TECHNICAL"] as const).map((tone) => {
                const hasVersion = post.versions.some((v) => v.tone === tone);
                return (
                  <Button
                    key={tone}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      hasVersion
                        ? handleRegenerateVersion(tone)
                        : handleGenerateVersion(tone)
                    }
                    disabled={generatingTone !== null}
                  >
                    {generatingTone === tone ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        생성 중...
                      </>
                    ) : hasVersion ? (
                      <>
                        <RefreshCw className="mr-1 h-3 w-3" />
                        {TONE_LABELS[tone]} 재생성
                      </>
                    ) : (
                      <>
                        <Plus className="mr-1 h-3 w-3" />
                        {TONE_LABELS[tone]} 생성
                      </>
                    )}
                  </Button>
                );
              })}
            </div>
          )}

          {/* 편집 폼 */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
              />
            </div>

            {/* URL Slug + 카테고리 (2열 레이아웃) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* URL Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {post.type === "COMMIT_BASED"
                      ? "/log/"
                      : post.contentType?.pluralSlug
                        ? `/${post.contentType.pluralSlug}/`
                        : post.contentType?.slug
                          ? `/${post.contentType.slug}/`
                          : "/post/"}
                  </span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      const value = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "");
                      setSlug(value);
                    }}
                    placeholder="seo-friendly-url"
                    className="font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.
                </p>
              </div>

              {/* 카테고리 */}
              <div className="space-y-2">
                <Label>카테고리</Label>
                <div className="flex gap-2">
                  <Select
                    value={category}
                    onValueChange={setCategory}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CATEGORY_NONE}>없음</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value={CATEGORY_CUSTOM}>+ 새 카테고리</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {category === CATEGORY_CUSTOM && (
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="새 카테고리명"
                    className="mt-2"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  사이드 메뉴와 연동하여 카테고리별로 분류합니다.
                </p>
              </div>
            </div>

            {/* 썸네일 이미지 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                목록 썸네일 이미지
              </Label>
              <ImageUploader
                currentImageUrl={thumbnailUrl}
                uploadEndpoint="/api/upload/post-thumbnail"
                deleteEndpoint="/api/upload/post-thumbnail"
                uploadData={{ postId: id }}
                aspectRatio="16:9"
                onUploadSuccess={(url) => setThumbnailUrl(url)}
                onDeleteSuccess={() => setThumbnailUrl(null)}
                onError={(message) => alert(message)}
                placeholder="썸네일 이미지 업로드 (16:9)"
                className="max-w-md"
              />
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">내용</Label>
                <MarkdownGuideDialog />
              </div>
              <MarkdownEditor
                value={content}
                onChange={(val) => setContent(val)}
                minHeight={800}
              />
            </div>
          </div>

          <Separator className="my-8" />

          {/* 커밋 목록 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">커밋 내역</h2>
            <div className="space-y-3">
              {post.commits.map((commit) => (
                <a
                  key={commit.id}
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">{commit.message}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {repoDisplayNameMap.get(commit.repository) || commit.repository} · {commit.author}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      <span className="text-green-600">+{commit.additions}</span>
                      {" / "}
                      <span className="text-red-600">-{commit.deletions}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
