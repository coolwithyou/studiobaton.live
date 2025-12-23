"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface PostVersion {
  id: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
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

interface Post {
  id: string;
  targetDate: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  title: string | null;
  content: string | null;
  summary: string | null;
  slug: string | null;
  versions: PostVersion[];
  commits: Commit[];
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
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

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
      } else if (data.versions.length > 0) {
        const firstVersion = data.versions[0];
        setSelectedVersionId(firstVersion.id);
        setTitle(firstVersion.title);
        setContent(firstVersion.content);
        setSummary(firstVersion.summary || "");
      }
    } catch (error) {
      console.error("Error fetching post:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (version: PostVersion) => {
    if (post?.status === "PUBLISHED") return;
    setSelectedVersionId(version.id);
    setTitle(version.title);
    setContent(version.content);
    setSummary(version.summary || "");
    setIsEditing(false);
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
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
          action: "publish",
          versionId: selectedVersionId,
        }),
      });

      if (!res.ok) throw new Error("Failed to publish");

      router.push("/admin");
      router.refresh();
    } catch (error) {
      console.error("Error publishing:", error);
      alert("발행 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-32 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <p>포스트를 찾을 수 없습니다.</p>
        <Button onClick={() => router.push("/admin")} className="mt-4">
          돌아가기
        </Button>
      </div>
    );
  }

  const isPublished = post.status === "PUBLISHED";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
            {format(new Date(post.targetDate), "yyyy년 M월 d일", { locale: ko })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {post.commits.length}개의 커밋
          </p>
        </div>
        {!isPublished && (
          <Button onClick={handlePublish} disabled={saving}>
            {saving ? "발행 중..." : "발행하기"}
          </Button>
        )}
      </div>

      {/* 버전 선택 탭 */}
      {!isPublished && post.versions.length > 0 && (
        <Tabs
          value={selectedVersionId || post.versions[0].id}
          onValueChange={(v) => {
            const version = post.versions.find((ver) => ver.id === v);
            if (version) handleVersionSelect(version);
          }}
          className="mb-6"
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
            disabled={isPublished}
            placeholder="제목을 입력하세요"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">내용</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsEditing(true);
            }}
            disabled={isPublished}
            placeholder="내용을 입력하세요"
            className="min-h-[300px] font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">요약 (선택)</Label>
          <Input
            id="summary"
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              setIsEditing(true);
            }}
            disabled={isPublished}
            placeholder="짧은 요약을 입력하세요"
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
                    {commit.repository} · {commit.author}
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
  );
}
