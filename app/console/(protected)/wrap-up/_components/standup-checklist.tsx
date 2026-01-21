"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { startOfDayKST } from "@/lib/date-utils";

interface Task {
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
  dueDate?: string;
  originalDueDate?: string;
}

interface StandupChecklistProps {
  tasks: Task[];
  carriedOverTasks?: Task[];
  onTaskToggled?: (taskId: string, isCompleted: boolean) => void;
}

export function StandupChecklist({
  tasks,
  carriedOverTasks = [],
  onTaskToggled,
}: StandupChecklistProps) {
  // 로컬 상태로 태스크 관리 (optimistic update용)
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [localCarryoverTasks, setLocalCarryoverTasks] = useState<Task[]>(carriedOverTasks);

  // props가 변경되면 로컬 상태 동기화
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    setLocalCarryoverTasks(carriedOverTasks);
  }, [carriedOverTasks]);

  // 캐리오버 뱃지 계산
  const getDaysAgo = (task: Task): number | null => {
    if (!task.originalDueDate) return null;
    const today = startOfDayKST(new Date());
    const originalDate = startOfDayKST(parseISO(task.originalDueDate));
    const daysAgo = differenceInDays(today, originalDate);
    return daysAgo > 0 ? daysAgo : null;
  };

  const handleToggleComplete = async (task: Task, isCarryover: boolean = false) => {
    const newIsCompleted = !task.isCompleted;

    // Optimistic update: UI를 즉시 업데이트
    const updateTasks = isCarryover ? setLocalCarryoverTasks : setLocalTasks;
    updateTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, isCompleted: newIsCompleted } : t
      )
    );

    try {
      const response = await fetch(`/api/console/standup/task/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: newIsCompleted }),
      });

      if (!response.ok) {
        // 실패 시 롤백
        updateTasks((prev) =>
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

  const allTasks = [...localCarryoverTasks, ...localTasks];
  const totalCount = allTasks.length;

  if (totalCount === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        오늘 등록된 스탠드업 할 일이 없습니다.
      </div>
    );
  }

  const completedCount = allTasks.filter((t) => t.isCompleted).length;
  const allCompleted = completedCount === totalCount;

  // 태스크 아이템 렌더링 헬퍼
  const renderTaskItem = (task: Task, isCarryover: boolean = false) => {
    const daysAgo = getDaysAgo(task);

    return (
      <div
        key={task.id}
        className={cn(
          "flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
          task.isCompleted && "bg-muted/30"
        )}
        onClick={() => handleToggleComplete(task, isCarryover)}
      >
        <div className="pt-0.5">
          <Checkbox
            checked={task.isCompleted}
            onCheckedChange={() => {}}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1">
            <p
              className={cn(
                "text-sm",
                task.isCompleted && "line-through text-muted-foreground"
              )}
            >
              {renderContent(task.content)}
            </p>
            {isCarryover && daysAgo && (
              <Badge
                variant="outline"
                className="ml-1 text-xs font-normal text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950"
              >
                <Clock className="size-3 mr-1" />
                {daysAgo}일 전
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 진행률 표시 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          전체 할 일
          {localCarryoverTasks.length > 0 && (
            <span className="text-orange-600 dark:text-orange-400 ml-1">
              (미완료 {localCarryoverTasks.length}개 포함)
            </span>
          )}
        </span>
        <span
          className={cn(
            "font-medium",
            allCompleted ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
          )}
        >
          {completedCount}/{totalCount} 완료
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
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* 미완료 캐리오버 태스크 목록 */}
      {localCarryoverTasks.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
            <Clock className="size-3" />
            미완료 할 일
          </span>
          <div className="space-y-1">
            {localCarryoverTasks.map((task) => renderTaskItem(task, true))}
          </div>
        </div>
      )}

      {/* 오늘의 태스크 목록 */}
      {localTasks.length > 0 && (
        <div className="space-y-1">
          {localCarryoverTasks.length > 0 && (
            <span className="text-xs text-muted-foreground font-medium">
              오늘의 할 일
            </span>
          )}
          <div className="space-y-1">
            {localTasks.map((task) => renderTaskItem(task, false))}
          </div>
        </div>
      )}
    </div>
  );
}
