"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { ContentTypeList } from "./_components/content-type-list";
import { ContentTypeForm } from "./_components/content-type-form";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

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

export default function ContentTypesPage() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);

  // 폼 상태
  const [formOpen, setFormOpen] = useState(false);
  const [editingContentType, setEditingContentType] = useState<ContentType | undefined>();

  // 데이터 로드
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/console/content-types");
      if (response.ok) {
        const data = await response.json();
        setContentTypes(data.contentTypes || []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 핸들러
  const handleAdd = () => {
    setEditingContentType(undefined);
    setFormOpen(true);
  };

  const handleEdit = (contentType: ContentType) => {
    setEditingContentType(contentType);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/console/content-types?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || "삭제 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleReorder = async (items: { id: string; displayOrder: number }[]) => {
    try {
      const response = await fetch("/api/console/content-types/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Reorder error:", error);
    }
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="콘텐츠 타입 관리"
        description="블로그 콘텐츠의 카테고리 체계를 관리합니다. 새 콘텐츠 타입을 추가하면 자동으로 URL이 생성됩니다."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            콘텐츠 타입 추가
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          로딩 중...
        </div>
      ) : (
        <ContentTypeList
          contentTypes={contentTypes}
          onReorder={handleReorder}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* 폼 다이얼로그 */}
      <ContentTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contentType={editingContentType}
        onSave={fetchData}
      />
    </PageContainer>
  );
}
