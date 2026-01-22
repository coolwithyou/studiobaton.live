"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { SectionList } from "./_components/section-list";
import { SectionForm } from "./_components/section-form";
import { ItemForm } from "./_components/item-form";
import type { LinkType } from "@/app/generated/prisma";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

interface Item {
  id: string;
  sectionId: string;
  title: string;
  displayOrder: number;
  isActive: boolean;
  linkType: LinkType;
  internalPath: string | null;
  externalUrl: string | null;
  postCategory: string | null;
  customSlug: string | null;
  activePattern: string | null;
}

interface Section {
  id: string;
  title: string;
  displayOrder: number;
  isActive: boolean;
  items: Item[];
}

export default function SidemenuPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 섹션 폼 상태
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | undefined>();

  // 아이템 폼 상태
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>();
  const [defaultSectionId, setDefaultSectionId] = useState<string | undefined>();

  // 데이터 로드
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sectionsRes, categoriesRes] = await Promise.all([
        fetch("/api/console/sidemenu/sections"),
        fetch("/api/console/posts/categories"),
      ]);

      if (sectionsRes.ok) {
        const data = await sectionsRes.json();
        setSections(data.sections || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
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

  // 섹션 관련 핸들러
  const handleAddSection = () => {
    setEditingSection(undefined);
    setSectionFormOpen(true);
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionFormOpen(true);
  };

  const handleDeleteSection = async (id: string) => {
    try {
      const response = await fetch(`/api/console/sidemenu/sections?id=${id}`, {
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

  const handleReorderSections = async (
    items: { id: string; displayOrder: number }[]
  ) => {
    try {
      const response = await fetch("/api/console/sidemenu/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sections", items }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Reorder error:", error);
    }
  };

  // 아이템 관련 핸들러
  const handleAddItem = (sectionId: string) => {
    setEditingItem(undefined);
    setDefaultSectionId(sectionId);
    setItemFormOpen(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setDefaultSectionId(undefined);
    setItemFormOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/console/sidemenu/items?id=${id}`, {
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

  const handleReorderItems = async (
    sectionId: string,
    items: { id: string; displayOrder: number }[]
  ) => {
    try {
      const response = await fetch("/api/console/sidemenu/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "items", sectionId, items }),
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
        title="사이드 메뉴 관리"
        description="공개 페이지에 표시되는 사이드 메뉴를 관리합니다."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button onClick={handleAddSection}>
            <Plus className="h-4 w-4 mr-2" />
            섹션 추가
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          로딩 중...
        </div>
      ) : (
        <SectionList
          sections={sections}
          categories={categories}
          onReorder={handleReorderSections}
          onEdit={handleEditSection}
          onDelete={handleDeleteSection}
          onAddItem={handleAddItem}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          onReorderItems={handleReorderItems}
          onRefresh={fetchData}
        />
      )}

      {/* 섹션 폼 다이얼로그 */}
      <SectionForm
        open={sectionFormOpen}
        onOpenChange={setSectionFormOpen}
        section={editingSection}
        onSave={fetchData}
      />

      {/* 아이템 폼 다이얼로그 */}
      <ItemForm
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        item={editingItem}
        sections={sections.map((s) => ({ id: s.id, title: s.title }))}
        defaultSectionId={defaultSectionId}
        categories={categories}
        onSave={fetchData}
      />
    </PageContainer>
  );
}
