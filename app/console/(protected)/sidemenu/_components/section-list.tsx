"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ItemList } from "./item-list";
import type { LinkType } from "@/app/generated/prisma";

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

interface Section {
  id: string;
  title: string;
  displayOrder: number;
  isActive: boolean;
  items: Item[];
}

interface SectionListProps {
  sections: Section[];
  categories: string[];
  onReorder: (items: { id: string; displayOrder: number }[]) => Promise<void>;
  onEdit: (section: Section) => void;
  onDelete: (id: string) => Promise<void>;
  onAddItem: (sectionId: string) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => Promise<void>;
  onReorderItems: (
    sectionId: string,
    items: { id: string; displayOrder: number }[]
  ) => Promise<void>;
  onRefresh: () => void;
}

export function SectionList({
  sections,
  categories,
  onReorder,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onReorderItems,
  onRefresh,
}: SectionListProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reorderData = items.map((item, index) => ({
      id: item.id,
      displayOrder: index,
    }));

    await onReorder(reorderData);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>등록된 섹션이 없습니다.</p>
        <p className="text-sm mt-1">새 섹션을 추가하여 사이드 메뉴를 구성하세요.</p>
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {sections.map((section, index) => (
                <Draggable
                  key={section.id}
                  draggableId={section.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`border rounded-lg bg-card ${
                        snapshot.isDragging ? "shadow-lg" : ""
                      }`}
                    >
                      {/* 섹션 헤더 */}
                      <div className="flex items-center gap-2 p-3 border-b">
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <button
                          onClick={() => toggleSection(section.id)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {expandedSections.has(section.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>

                        <span className="font-medium flex-1">
                          {section.title}
                        </span>

                        <Badge
                          variant={section.isActive ? "default" : "secondary"}
                        >
                          {section.isActive ? "활성" : "비활성"}
                        </Badge>

                        <span className="text-sm text-muted-foreground">
                          {section.items.length}개 항목
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onAddItem(section.id)}
                            title="아이템 추가"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(section)}
                            title="수정"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(section)}
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* 아이템 목록 */}
                      {expandedSections.has(section.id) && (
                        <div className="p-3 bg-muted/30">
                          <ItemList
                            sectionId={section.id}
                            items={section.items}
                            categories={categories}
                            onReorder={(items) =>
                              onReorderItems(section.id, items)
                            }
                            onEdit={onEditItem}
                            onDelete={onDeleteItem}
                            onRefresh={onRefresh}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>섹션 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; 섹션을 삭제하시겠습니까?
              <br />
              <strong className="text-destructive">
                이 섹션에 포함된 모든 메뉴 아이템도 함께 삭제됩니다.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
