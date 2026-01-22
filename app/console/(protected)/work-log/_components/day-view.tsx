"use client";

import { useState, useEffect, useCallback } from "react";
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
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
}

interface DayViewProps {
  memberId: string;
  memberGithubName: string;
  date: Date;
}

export function DayView({ memberId, memberGithubName, date }: DayViewProps) {
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commitsOpen, setCommitsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = formatKST(date, "yyyy-MM-dd");

      // 병렬 요청
      const [standupRes, reviewRes] = await Promise.all([
        fetch(`/api/console/standup?date=${dateStr}&memberId=${memberId}`),
        fetch(`/api/console/review?date=${dateStr}&memberId=${memberId}`),
      ]);

      const [standupJson, reviewJson] = await Promise.all([
        standupRes.json(),
        reviewRes.json(),
      ]);

      setData({
        date: dateStr,
        standup: standupRes.ok ? standupJson.standup : null,
        commits: reviewRes.ok
          ? reviewJson
          : { repositories: [], summary: { totalCommits: 0, totalAdditions: 0, totalDeletions: 0 } },
      });
    } catch (error) {
      console.error("Failed to fetch day data:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, memberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const tasks = data.standup?.tasks || [];
  const carriedOverTasks = data.standup?.carriedOverTasks || [];
  const allTasks = [...carriedOverTasks, ...tasks];
  const completedCount = allTasks.filter((t) => t.isCompleted).length;
  const totalCount = allTasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const hasCommits = data.commits.summary.totalCommits > 0;

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

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 할 일 요약 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              할 일 진행률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {completedCount}/{totalCount}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}% 완료
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              {carriedOverTasks.length > 0 && (
                <p className="text-xs text-orange-600">
                  미완료 {carriedOverTasks.length}개 포함
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 커밋 요약 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              커밋 활동
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {data.commits.summary.totalCommits}
                </span>
                <span className="text-sm">
                  <span className="text-green-600">
                    +{data.commits.summary.totalAdditions}
                  </span>
                  {" / "}
                  <span className="text-red-600">
                    -{data.commits.summary.totalDeletions}
                  </span>
                </span>
              </div>
              {data.commits.repositories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {data.commits.repositories.slice(0, 3).map((repo) => (
                    <Badge key={repo.name} variant="secondary" className="text-xs">
                      {repo.displayName || repo.name} ({repo.totalCommits})
                    </Badge>
                  ))}
                  {data.commits.repositories.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{data.commits.repositories.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 할 일 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">할 일 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {allTasks.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">
              등록된 할 일이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {allTasks.map((task) => {
                const isCarriedOver = carriedOverTasks.some((t) => t.id === task.id);
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      task.isCompleted && "bg-muted/50"
                    )}
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="size-5 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm",
                          task.isCompleted && "line-through text-muted-foreground"
                        )}
                      >
                        {renderContent(task.content)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.repository && (
                          <Badge variant="outline" className="text-xs">
                            {task.repository}
                          </Badge>
                        )}
                        {isCarriedOver && (
                          <Badge
                            variant="outline"
                            className="text-xs text-orange-600 border-orange-300"
                          >
                            <Clock className="size-3 mr-1" />
                            이월
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 커밋 상세 (접이식) */}
      {hasCommits && (
        <Collapsible open={commitsOpen} onOpenChange={setCommitsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <GitCommit className="size-4" />
                    커밋 상세 ({data.commits.summary.totalCommits})
                  </span>
                  {commitsOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {data.commits.repositories.map((repo) => (
                    <div key={repo.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">
                          {repo.displayName || repo.name}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          <span className="text-green-600">+{repo.totalAdditions}</span>
                          {" / "}
                          <span className="text-red-600">-{repo.totalDeletions}</span>
                        </span>
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-muted">
                        {repo.commits.map((commit) => (
                          <div
                            key={commit.sha}
                            className="flex items-start gap-2 py-1"
                          >
                            <code className="text-xs text-muted-foreground font-mono shrink-0">
                              {commit.sha.slice(0, 7)}
                            </code>
                            <a
                              href={commit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm hover:text-primary hover:underline line-clamp-1"
                            >
                              {commit.message.split("\n")[0]}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 커밋 없음 */}
      {!hasCommits && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              이 날짜에는 커밋이 없습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
