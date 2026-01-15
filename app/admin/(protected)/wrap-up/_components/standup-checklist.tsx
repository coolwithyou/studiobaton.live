"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
}

interface StandupChecklistProps {
  tasks: Task[];
  onTaskUpdated: () => void;
}

export function StandupChecklist({ tasks, onTaskUpdated }: StandupChecklistProps) {
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());

  const handleToggleComplete = async (task: Task) => {
    setUpdatingTasks((prev) => new Set(prev).add(task.id));
    try {
      const response = await fetch(`/api/admin/standup/task/${task.id}`, {
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

  // @mention을 링크로 변환
  const renderContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+)/g);

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const repoPath = part.substring(1);
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
      <div className="text-center py-6 text-muted-foreground text-sm">
        오늘 등록된 스탠드업 할 일이 없습니다.
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const allCompleted = completedCount === tasks.length;

  return (
    <div className="space-y-3">
      {/* 진행률 표시 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">오늘의 할 일</span>
        <span
          className={cn(
            "font-medium",
            allCompleted ? "text-green-600" : "text-orange-600"
          )}
        >
          {completedCount}/{tasks.length} 완료
          {allCompleted && <CheckCircle2 className="inline-block ml-1 size-4" />}
        </span>
      </div>

      {/* 진행률 바 */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            allCompleted ? "bg-green-500" : "bg-primary"
          )}
          style={{ width: `${(completedCount / tasks.length) * 100}%` }}
        />
      </div>

      {/* 태스크 목록 */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
              task.isCompleted && "bg-muted/30"
            )}
            onClick={() => handleToggleComplete(task)}
          >
            <div className="pt-0.5">
              {updatingTasks.has(task.id) ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <Checkbox
                  checked={task.isCompleted}
                  onCheckedChange={() => {}}
                />
              )}
            </div>

            <p
              className={cn(
                "text-sm flex-1",
                task.isCompleted && "line-through text-muted-foreground"
              )}
            >
              {renderContent(task.content)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
