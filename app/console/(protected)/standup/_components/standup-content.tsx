"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { formatKST } from "@/lib/date-utils";
import { Loader2, Clock } from "lucide-react";
import { StandupForm } from "./standup-form";
import { TaskList, Task } from "./task-list";

interface StandupData {
  date: string;
  member: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  standup: {
    id: string | null;
    tasks: Task[];
    carriedOverTasks: Task[];
  };
}

interface StandupContentProps {
  memberId: string;
  selectedDate: Date;
}

export function StandupContent({ memberId, selectedDate }: StandupContentProps) {
  const [standupData, setStandupData] = useState<StandupData | null>(null);
  const [initialFetching, setInitialFetching] = useState(true);
  const hasLoadedRef = useRef(false);

  // 스탠드업 데이터 조회
  const fetchStandup = useCallback(
    async (silent = false) => {
      // 초기 로딩 시에만 스피너 표시
      if (!silent && !hasLoadedRef.current) {
        setInitialFetching(true);
      }

      try {
        const dateStr = formatKST(selectedDate, "yyyy-MM-dd");
        const response = await fetch(
          `/api/console/standup?date=${dateStr}&memberId=${memberId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch standup data");
        }

        setStandupData(data);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error("Failed to fetch standup:", error);
        if (!silent) {
          setStandupData(null);
        }
      } finally {
        setInitialFetching(false);
      }
    },
    [selectedDate, memberId]
  );

  // memberId 또는 날짜 변경 시 데이터 리셋 및 재조회
  useEffect(() => {
    hasLoadedRef.current = false;
    setStandupData(null);
    fetchStandup();
  }, [memberId, selectedDate, fetchStandup]);

  const handleTaskAdded = () => {
    // 백그라운드에서 데이터 갱신 (스피너 없이)
    fetchStandup(true);
  };

  const isToday =
    formatKST(selectedDate, "yyyy-MM-dd") === formatKST(new Date(), "yyyy-MM-dd");
  const tasks = standupData?.standup?.tasks || [];
  const carriedOverTasks = standupData?.standup?.carriedOverTasks || [];
  const allTasks = [...carriedOverTasks, ...tasks];
  const completedCount = allTasks.filter((t) => t.isCompleted).length;
  const totalCount = allTasks.length;

  return (
    <div className="space-y-6">
      {initialFetching ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 할 일 입력 폼 */}
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="text-sm font-medium mb-3">할 일 추가</h3>
            <StandupForm
              date={selectedDate}
              memberId={memberId}
              onTaskAdded={handleTaskAdded}
            />
          </div>

          {/* 통계 */}
          {totalCount > 0 && (
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg text-sm">
              <span>
                총 <strong>{totalCount}</strong>개
                {carriedOverTasks.length > 0 && (
                  <span className="text-orange-600 ml-1">
                    (미완료 {carriedOverTasks.length}개 포함)
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-green-600">
                완료 <strong>{completedCount}</strong>개
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-orange-600">
                남음 <strong>{totalCount - completedCount}</strong>개
              </span>
            </div>
          )}

          {/* 미완료 캐리오버 목록 */}
          {carriedOverTasks.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium mb-3 text-orange-600">
                <Clock className="size-4" />
                미완료 할 일 ({carriedOverTasks.length})
              </h3>
              <TaskList
                tasks={carriedOverTasks}
                onTaskUpdated={handleTaskAdded}
                showDueDateBadge
              />
            </div>
          )}

          {/* 오늘의 할 일 목록 */}
          <div>
            <h3 className="text-sm font-medium mb-3">
              {isToday ? "오늘의 할 일" : `${formatKST(selectedDate, "M월 d일")}의 할 일`}
              {tasks.length > 0 && (
                <span className="text-muted-foreground font-normal ml-2">
                  ({tasks.length})
                </span>
              )}
            </h3>
            <TaskList tasks={tasks} onTaskUpdated={handleTaskAdded} />
          </div>
        </div>
      )}
    </div>
  );
}
