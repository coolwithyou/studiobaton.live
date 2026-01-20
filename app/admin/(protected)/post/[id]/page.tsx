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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatKST } from "@/lib/date-utils";
import { Loader2, Plus, RefreshCw } from "lucide-react";
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
  title: string | null;
  content: string | null;
  summary: string | null;
  slug: string | null;
  category: string | null;
  showInTimeline: boolean;
  versions: PostVersion[];
  commits: Commit[];
  repositoryMappings: RepositoryMapping[];
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

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [slug, setSlug] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalData, setOriginalData] = useState<{
    title: string;
    content: string;
    summary: string;
    slug: string;
  } | null>(null);
  const [generatingTone, setGeneratingTone] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);
  const [category, setCategory] = useState<string>(CATEGORY_NONE);
  const [customCategory, setCustomCategory] = useState("");
  const [showInTimeline, setShowInTimeline] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchPost();
    fetchCategories();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/posts/categories");
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
      const res = await fetch(`/api/admin/posts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPost(data);

      // 기본값 설정
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
    if (post?.status === "PUBLISHED" && !isEditMode) return;
    setSelectedVersionId(version.id);
    setTitle(version.title);
    setContent(version.content);
    setSummary(version.summary || "");
    setSlug(version.suggestedSlug || "");
    setIsEditing(false);
  };

  const handleEnterEditMode = () => {
    setOriginalData({ title, content, summary, slug });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (originalData) {
      setTitle(originalData.title);
      setContent(originalData.content);
      setSummary(originalData.summary);
      setSlug(originalData.slug);
    }
    setIsEditMode(false);
    setOriginalData(null);
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
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          summary,
          category: finalCategory,
          showInTimeline,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setIsEditMode(false);
      setOriginalData(null);
      await fetchPost();
    } catch (error) {
      console.error("Error saving:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
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
      const res = await fetch(`/api/admin/posts/${id}`, {
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

      router.push("/admin");
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
      const res = await fetch(`/api/admin/posts/${id}`, {
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
      setIsEditMode(false);
      setOriginalData(null);
    } catch (error) {
      console.error("Error unpublishing:", error);
      alert("발행 취소 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateVersion = async (
    tone: "PROFESSIONAL" | "CASUAL" | "TECHNICAL",
    forceRegenerate: boolean = false
  ) => {
    setGeneratingTone(tone);
    try {
      const res = await fetch(`/api/admin/posts/${id}/versions`, {
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
          <Button onClick={() => router.push("/admin")} className="mt-4">
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
              onClick={() => router.push("/admin")}
            >
              ← 목록
            </Button>
            <Badge variant={isPublished ? "default" : "secondary"}>
              {isPublished ? "발행됨" : "대기중"}
            </Badge>
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
            <Button onClick={handlePublish} disabled={saving}>
              {saving ? "발행 중..." : "발행하기"}
            </Button>
          )}
          {isPublished && !isEditMode && (
            <>
              <Button variant="outline" onClick={handleUnpublish} disabled={saving}>
                발행 취소
              </Button>
              <Button onClick={handleEnterEditMode}>수정하기</Button>
            </>
          )}
          {isPublished && isEditMode && (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saving}>
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
          {(!isPublished || isEditMode) && post.versions.length > 0 && (
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
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsEditing(true);
                }}
                disabled={isPublished && !isEditMode}
                placeholder="제목을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  /post/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    // 소문자, 숫자, 하이픈만 허용
                    const value = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "");
                    setSlug(value);
                    setIsEditing(true);
                  }}
                  disabled={isPublished && !isEditMode}
                  placeholder="seo-friendly-url"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다. AI가 제안한 slug를 수정할 수 있습니다.
              </p>
            </div>

            {/* 카테고리 선택 */}
            <div className="space-y-2">
              <Label>카테고리</Label>
              <div className="flex gap-2">
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={isPublished && !isEditMode}
                >
                  <SelectTrigger className="w-[200px]">
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
                {category === CATEGORY_CUSTOM && (
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="새 카테고리명"
                    className="flex-1"
                    disabled={isPublished && !isEditMode}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                사이드 메뉴와 연동하여 카테고리별로 포스트를 분류할 수 있습니다.
              </p>
            </div>

            {/* 타임라인 노출 */}
            <div className="flex items-center space-x-3 py-2">
              <Checkbox
                id="showInTimeline"
                checked={showInTimeline}
                onCheckedChange={(checked) => setShowInTimeline(checked === true)}
                disabled={isPublished && !isEditMode}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="showInTimeline"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  타임라인에 노출
                </Label>
                <p className="text-xs text-muted-foreground">
                  체크하면 메인 페이지 타임라인에 이 포스트가 표시됩니다.
                </p>
              </div>
            </div>

            {/* 요약 */}
            <div className="space-y-2">
              <Label htmlFor="summary">요약</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  setIsEditing(true);
                }}
                disabled={isPublished && !isEditMode}
                placeholder="포스트 요약 (목록에 표시됩니다)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <MarkdownEditor
                value={content}
                onChange={(val) => {
                  setContent(val);
                  setIsEditing(true);
                }}
                disabled={isPublished && !isEditMode}
                minHeight={400}
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
