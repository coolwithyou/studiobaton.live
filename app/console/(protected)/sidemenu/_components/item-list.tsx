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
import { GripVertical, Pencil, Trash2, ExternalLink, Link, Tag } from "lucide-react";
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

interface ItemListProps {
  sectionId: string;
  items: Item[];
  categories: string[];
  onReorder: (items: { id: string; displayOrder: number }[]) => Promise<void>;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

const LINK_TYPE_ICONS: Record<LinkType, React.ReactNode> = {
  INTERNAL: <Link className="h-3 w-3" />,
  EXTERNAL: <ExternalLink className="h-3 w-3" />,
  POST_CATEGORY: <Tag className="h-3 w-3" />,
};

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  INTERNAL: "내부",
  EXTERNAL: "외부",
  POST_CATEGORY: "카테고리",
};

function getLinkDisplay(item: Item): string {
  switch (item.linkType) {
    case "INTERNAL":
      return item.internalPath || "-";
    case "EXTERNAL":
      return item.externalUrl || "-";
    case "POST_CATEGORY":
      if (item.customSlug) {
        return `/${item.customSlug} (${item.postCategory})`;
      }
      return item.postCategory || "-";
    default:
      return "-";
  }
}

export function ItemList({
  sectionId,
  items,
  onReorder,
  onEdit,
  onDelete,
}: ItemListProps) {
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);

    const reorderData = reorderedItems.map((item, index) => ({
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

  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        이 섹션에 메뉴 아이템이 없습니다.
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`items-${sectionId}`}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-1"
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-2 p-2 rounded-md bg-background border ${
                        snapshot.isDragging ? "shadow-md" : ""
                      }`}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      <span className="font-medium text-sm flex-1">
                        {item.title}
                      </span>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {LINK_TYPE_ICONS[item.linkType]}
                        <span>{LINK_TYPE_LABELS[item.linkType]}</span>
                      </div>

                      <span
                        className="text-xs text-muted-foreground truncate max-w-[150px]"
                        title={getLinkDisplay(item)}
                      >
                        {getLinkDisplay(item)}
                      </span>

                      <Badge
                        variant={item.isActive ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {item.isActive ? "활성" : "비활성"}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(item)}
                          title="수정"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteTarget(item)}
                          title="삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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
            <AlertDialogTitle>메뉴 아이템 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; 메뉴를 삭제하시겠습니까?
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
