"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Loader2, ExternalLink, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  displayOrder: number;
}

interface TaskListProps {
  tasks: Task[];
  onTaskUpdated: () => void;
  readOnly?: boolean;
}

export function TaskList({ tasks, onTaskUpdated, readOnly = false }: TaskListProps) {
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [deletingTasks, setDeletingTasks] = useState<Set<string>>(new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleToggleComplete = async (task: Task) => {
    if (readOnly) return;

    setUpdatingTasks((prev) => new Set(prev).add(task.id));
    try {
      const response = await fetch(`/api/console/standup/task/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      onTaskUpdated();
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setUpdatingTasks((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (readOnly) return;
    if (!confirm("이 할 일을 삭제하시겠습니까?")) return;

    setDeletingTasks((prev) => new Set(prev).add(taskId));
    try {
      const response = await fetch(`/api/console/standup/task/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      onTaskUpdated();
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setDeletingTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditContent(task.content);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editContent.trim()) return;

    setSavingEdit(true);
    try {
      const response = await fetch(`/api/console/standup/task/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      setEditingTaskId(null);
      setEditContent("");
      onTaskUpdated();
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setSavingEdit(false);
    }
  };

  // @mention을 링크로 변환
  const renderContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+)/g);

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const repoPath = part.substring(1); // @ 제거
        return (
          <a
            key={index}
            href={`https://github.com/${repoPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
            <ExternalLink className="size-3" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        등록된 할 일이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "flex items-center gap-3 p-3 border rounded-lg transition-colors",
            task.isCompleted && "bg-muted/50"
          )}
        >
          <div>
            {updatingTasks.has(task.id) ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <Checkbox
                checked={task.isCompleted}
                onCheckedChange={() => handleToggleComplete(task)}
                disabled={readOnly}
              />
            )}
          </div>

          {editingTaskId === task.id ? (
            <div className="flex-1 min-w-0 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
                placeholder="할 일 내용을 입력하세요"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit(task.id);
                  }
                  if (e.key === "Escape") {
                    handleCancelEdit();
                  }
                }}
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => handleSaveEdit(task.id)}
                  disabled={savingEdit || !editContent.trim()}
                >
                  {savingEdit ? (
                    <Loader2 className="size-4 animate-spin mr-1" />
                  ) : (
                    <Check className="size-4 mr-1" />
                  )}
                  저장
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={savingEdit}
                >
                  <X className="size-4 mr-1" />
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm",
                  task.isCompleted && "line-through text-muted-foreground"
                )}
              >
                {renderContent(task.content)}
              </p>
              {task.repository && (
                <div className="mt-1">
                  <a
                    href={`https://github.com/${task.repository}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <span className="px-1.5 py-0.5 bg-muted rounded">
                      @{task.repository}
                    </span>
                  </a>
                </div>
              )}
            </div>
          )}

          {!readOnly && editingTaskId !== task.id && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-primary"
                onClick={() => handleEdit(task)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(task.id)}
                disabled={deletingTasks.has(task.id)}
              >
                {deletingTasks.has(task.id) ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
