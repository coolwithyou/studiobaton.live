"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { formatKST } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  GitCommit,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
  dueDate: string;
  originalDueDate: string;
}

interface Commit {
  sha: string;
  message: string;
  committedAt: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  url: string;
}

interface Repository {
  name: string;
  displayName: string | null;
  commits: Commit[];
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
}

interface AiSummary {
  exists: boolean;
  summary?: {
    totalCommits: number;
    highlightCount: number;
    primaryFocus: string;
  };
}

interface DayData {
  date: string;
  standup: {
    tasks: Task[];
    carriedOverTasks: Task[];
  } | null;
  commits: {
    repositories: Repository[];
    summary: {
      totalCommits: number;
      totalAdditions: number;
      totalDeletions: number;
    };
  };
  aiSummary?: AiSummary;
}

interface WeekData {
  days: DayData[];
  summary: {
    totalTasks: number;
    completedTasks: number;
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
  };
}

interface WeekViewProps {
  memberId: string;
  memberGithubName: string;
  date: Date;
}

export function WeekView({ memberId, memberGithubName, date }: WeekViewProps) {
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  // 모든 일자가 펼쳐진 상태를 추적 (Set에 포함되면 접힌 상태, 날짜 문자열 사용)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 주간 날짜 계산 (useCallback 내부에서 계산하여 의존성 배열 문제 해결)
      const weekStartDate = startOfWeek(date, { weekStartsOn: 1 });
      const weekEndDate = endOfWeek(date, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });

      // 각 날짜별 데이터 병렬 요청
      const dayPromises = weekDays.map(async (day) => {
        const dateStr = formatKST(day, "yyyy-MM-dd");
        const now = new Date();

        // 미래 날짜는 스킵
        if (day > now) {
          return {
            date: dateStr,
            standup: null,
            commits: {
              repositories: [],
              summary: { totalCommits: 0, totalAdditions: 0, totalDeletions: 0 },
            },
          };
        }

        const [standupRes, reviewRes, aiSummaryRes] = await Promise.all([
          fetch(`/api/console/standup?date=${dateStr}&memberId=${memberId}`),
          fetch(`/api/console/review?date=${dateStr}&memberId=${memberId}`),
          fetch(`/api/console/wrap-up/summarize?date=${dateStr}&memberId=${memberId}`),
        ]);

        const [standupJson, reviewJson, aiSummaryJson] = await Promise.all([
          standupRes.json(),
          reviewRes.json(),
          aiSummaryRes.ok ? aiSummaryRes.json() : { exists: false },
        ]);

        return {
          date: dateStr,
          standup: standupRes.ok ? standupJson.standup : null,
          commits: reviewRes.ok
            ? reviewJson
            : { repositories: [], summary: { totalCommits: 0, totalAdditions: 0, totalDeletions: 0 } },
          aiSummary: aiSummaryJson as AiSummary,
        };
      });

      const days = await Promise.all(dayPromises);

      // 주간 요약 계산
      let totalTasks = 0;
      let completedTasks = 0;
      let totalCommits = 0;
      let totalAdditions = 0;
      let totalDeletions = 0;

      days.forEach((day) => {
        const tasks = [...(day.standup?.tasks || []), ...(day.standup?.carriedOverTasks || [])];
        totalTasks += tasks.length;
        completedTasks += tasks.filter((t) => t.isCompleted).length;
        totalCommits += day.commits.summary.totalCommits;
        totalAdditions += day.commits.summary.totalAdditions;
        totalDeletions += day.commits.summary.totalDeletions;
      });

      setData({
        days,
        summary: {
          totalTasks,
          completedTasks,
          totalCommits,
          totalAdditions,
          totalDeletions,
        },
      });
    } catch (error) {
      console.error("Failed to fetch week data:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, memberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          >
            {part}
            <ExternalLink className="size-3" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  const progressPercentage =
    data.summary.totalTasks > 0
      ? (data.summary.completedTasks / data.summary.totalTasks) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* 주간 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 할 일 진행률 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              주간 할 일 진행률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {data.summary.completedTasks}/{data.summary.totalTasks}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}% 완료
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 커밋 요약 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              주간 커밋 활동
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {data.summary.totalCommits}
                </span>
                <span className="text-sm">
                  <span className="text-green-600">
                    +{data.summary.totalAdditions}
                  </span>
                  {" / "}
                  <span className="text-red-600">
                    -{data.summary.totalDeletions}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                일 평균 {Math.round(data.summary.totalCommits / 7)} 커밋
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI 주간 요약 (플레이스홀더) */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="size-4" />
              AI 주간 요약
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              주간 업무 요약이 곧 추가됩니다.
            </p>
            <Badge variant="outline" className="mt-2 text-xs">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* 일별 타임라인 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {format(weekStart, "M월 d일", { locale: ko })} -{" "}
            {format(weekEnd, "M월 d일", { locale: ko })} 일별 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...data.days].reverse().map((day) => {
              const dayDate = new Date(day.date);
              const isToday = isSameDay(dayDate, new Date());
              const tasks = [
                ...(day.standup?.carriedOverTasks || []),
                ...(day.standup?.tasks || []),
              ];
              const completedCount = tasks.filter((t) => t.isCompleted).length;
              const hasData = tasks.length > 0 || day.commits.summary.totalCommits > 0;
              // 기본적으로 펼침 상태, collapsedDays에 포함되면 접힘
              const isExpanded = hasData && !collapsedDays.has(day.date);

              return (
                <div
                  key={day.date}
                  className={cn(
                    "border rounded-lg transition-colors",
                    isToday && "border-primary/50 bg-primary/5",
                    !hasData && "opacity-50"
                  )}
                >
                  {/* 일별 헤더 */}
                  <button
                    onClick={() => {
                      if (isExpanded) {
                        // 펼침 → 접힘: collapsedDays에 추가
                        setCollapsedDays((prev) => new Set([...prev, day.date]));
                      } else {
                        // 접힘 → 펼침: collapsedDays에서 제거
                        setCollapsedDays((prev) => {
                          const next = new Set(prev);
                          next.delete(day.date);
                          return next;
                        });
                      }
                    }}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px]">
                        <p className="text-xs text-muted-foreground">
                          {format(dayDate, "E", { locale: ko })}
                        </p>
                        <p className={cn("text-lg font-bold", isToday && "text-primary")}>
                          {format(dayDate, "d")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {tasks.length > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <CheckCircle2 className="size-4 text-green-500" />
                            <span>
                              {completedCount}/{tasks.length}
                            </span>
                          </div>
                        )}
                        {day.commits.summary.totalCommits > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <GitCommit className="size-4" />
                            <span>{day.commits.summary.totalCommits}</span>
                          </div>
                        )}
                        {day.aiSummary?.exists && day.aiSummary.summary?.primaryFocus && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Sparkles className="size-3.5 text-amber-500" />
                            <span className="truncate max-w-[200px]">
                              {day.aiSummary.summary.primaryFocus}
                            </span>
                          </div>
                        )}
                        {!hasData && (
                          <span className="text-sm text-muted-foreground">기록 없음</span>
                        )}
                      </div>
                    </div>
                    {hasData && (
                      <span className="text-xs text-muted-foreground">
                        {isExpanded ? "접기" : "펼치기"}
                      </span>
                    )}
                  </button>

                  {/* 일별 상세 - 2열 레이아웃 */}
                  {isExpanded && hasData && (
                    <div className="px-3 pb-3 border-t">
                      <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 좌측: 할 일 목록 */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase">
                            할 일 {tasks.length > 0 && `(${tasks.filter(t => t.isCompleted).length}/${tasks.length})`}
                          </h4>
                          {tasks.length > 0 ? (
                            <div className="space-y-1">
                              {tasks.map((task) => {
                                const isCarriedOver = day.standup?.carriedOverTasks?.some(
                                  (t) => t.id === task.id
                                );
                                return (
                                  <div
                                    key={task.id}
                                    className={cn(
                                      "flex items-start gap-2 py-1",
                                      task.isCompleted && "opacity-60"
                                    )}
                                  >
                                    {task.isCompleted ? (
                                      <CheckCircle2 className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    ) : (
                                      <Circle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                    )}
                                    <span
                                      className={cn(
                                        "text-sm",
                                        task.isCompleted && "line-through"
                                      )}
                                    >
                                      {renderContent(task.content)}
                                    </span>
                                    {isCarriedOver && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] text-orange-600 border-orange-300 shrink-0"
                                      >
                                        <Clock className="size-3 mr-0.5" />
                                        이월
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground py-2">
                              등록된 할 일 없음
                            </p>
                          )}
                        </div>

                        {/* 우측: 커밋 목록 */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase flex items-center justify-between">
                            <span>커밋 {day.commits.summary.totalCommits > 0 && `(${day.commits.summary.totalCommits})`}</span>
                            {day.commits.summary.totalCommits > 0 && (
                              <span>
                                <span className="text-green-600">
                                  +{day.commits.summary.totalAdditions}
                                </span>
                                {" / "}
                                <span className="text-red-600">
                                  -{day.commits.summary.totalDeletions}
                                </span>
                              </span>
                            )}
                          </h4>
                          {day.commits.summary.totalCommits > 0 ? (
                            <div className="space-y-2">
                              {day.commits.repositories.map((repo) => (
                                <div key={repo.name} className="space-y-1">
                                  <p className="text-xs font-medium">
                                    {repo.displayName || repo.name}
                                  </p>
                                  <div className="pl-2 border-l-2 border-muted space-y-0.5">
                                    {repo.commits.map((commit) => (
                                      <a
                                        key={commit.sha}
                                        href={commit.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-xs text-muted-foreground hover:text-foreground truncate"
                                      >
                                        <code className="text-[10px] font-mono mr-1">
                                          {commit.sha.slice(0, 7)}
                                        </code>
                                        {commit.message.split("\n")[0]}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground py-2">
                              커밋 없음
                            </p>
                          )}
                        </div>
                      </div>

                      {/* AI 하루 평 */}
                      {day.aiSummary?.exists && day.aiSummary.summary?.primaryFocus && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-start gap-2">
                            <Sparkles className="size-4 text-amber-500 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              <h4 className="text-xs font-medium text-muted-foreground uppercase">
                                AI 하루 평
                              </h4>
                              <p className="text-sm text-foreground">
                                {day.aiSummary.summary.primaryFocus}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
