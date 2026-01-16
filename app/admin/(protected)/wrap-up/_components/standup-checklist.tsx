"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
}

interface StandupChecklistProps {
  tasks: Task[];
  onTaskToggled?: (taskId: string, isCompleted: boolean) => void;
}

export function StandupChecklist({ tasks, onTaskToggled }: StandupChecklistProps) {
  // 로컬 상태로 태스크 관리 (optimistic update용)
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // props가 변경되면 로컬 상태 동기화
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleToggleComplete = async (task: Task) => {
    const newIsCompleted = !task.isCompleted;

    // Optimistic update: UI를 즉시 업데이트
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, isCompleted: newIsCompleted } : t
      )
    );

    try {
      const response = await fetch(`/api/admin/standup/task/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: newIsCompleted }),
      });

      if (!response.ok) {
        // 실패 시 롤백
        setLocalTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, isCompleted: !newIsCompleted } : t
          )
        );
        throw new Error("Failed to update task");
      }

      // 부모에게 변경 알림 (전체 refetch 없이)
      onTaskToggled?.(task.id, newIsCompleted);
    } catch (error) {
      console.error("Failed to update task:", error);
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

  if (localTasks.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        오늘 등록된 스탠드업 할 일이 없습니다.
      </div>
    );
  }

  const completedCount = localTasks.filter((t) => t.isCompleted).length;
  const allCompleted = completedCount === localTasks.length;

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
          {completedCount}/{localTasks.length} 완료
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
          style={{ width: `${(completedCount / localTasks.length) * 100}%` }}
        />
      </div>

      {/* 태스크 목록 */}
      <div className="space-y-2">
        {localTasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
              task.isCompleted && "bg-muted/30"
            )}
            onClick={() => handleToggleComplete(task)}
          >
            <div className="pt-0.5">
              <Checkbox
                checked={task.isCompleted}
                onCheckedChange={() => {}}
              />
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
