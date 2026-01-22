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
import { GripVertical, Pencil, Trash2, FileText, Menu } from "lucide-react";
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

interface ContentTypeListProps {
  contentTypes: ContentType[];
  onReorder: (items: { id: string; displayOrder: number }[]) => Promise<void>;
  onEdit: (contentType: ContentType) => void;
  onDelete: (id: string) => Promise<void>;
}

export function ContentTypeList({
  contentTypes,
  onReorder,
  onEdit,
  onDelete,
}: ContentTypeListProps) {
  const [deleteTarget, setDeleteTarget] = useState<ContentType | null>(null);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(contentTypes);
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

  if (contentTypes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>등록된 콘텐츠 타입이 없습니다.</p>
        <p className="text-sm mt-1">새 콘텐츠 타입을 추가해주세요.</p>
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="content-types">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {contentTypes.map((contentType, index) => (
                <Draggable
                  key={contentType.id}
                  draggableId={contentType.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-3 p-4 rounded-lg bg-card border ${
                        snapshot.isDragging ? "shadow-lg" : ""
                      }`}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                      >
                        <GripVertical className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {contentType.displayName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            /{contentType.pluralSlug}
                          </Badge>
                        </div>
                        {contentType.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {contentType.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            포스트 {contentType._count.posts}개
                          </span>
                          <span className="flex items-center gap-1">
                            <Menu className="h-3 w-3" />
                            메뉴 {contentType._count.menuItems}개
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={contentType.isActive ? "default" : "secondary"}
                      >
                        {contentType.isActive ? "활성" : "비활성"}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(contentType)}
                          title="수정"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(contentType)}
                          title="삭제"
                          disabled={
                            contentType._count.posts > 0 ||
                            contentType._count.menuItems > 0
                          }
                        >
                          <Trash2 className="h-4 w-4" />
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
            <AlertDialogTitle>콘텐츠 타입 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.displayName}&quot; 콘텐츠 타입을
              삭제하시겠습니까?
              <br />
              <span className="text-destructive">
                이 작업은 되돌릴 수 없습니다.
              </span>
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
