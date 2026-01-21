"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Loader2,
  RefreshCw,
  Database,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle2,
  FolderGit2,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

interface RepositoryStats {
  name: string;
  commitCount: number;
  lastCommitAt: string | null;
}

interface MemberCommitStats {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  commitCount: number;
}

interface CollectStatus {
  totalCommits: number;
  profileOnlyCommits: number;
  oldestCommit: string | null;
  latestCommit: string | null;
  rateLimit: {
    remaining: number;
    limit: number;
    reset: string;
  };
  repositories: RepositoryStats[];
  memberCommits: MemberCommitStats[];
}

interface AggregateStatus {
  members: Array<{
    id: string;
    name: string;
    email: string;
    hasStats: boolean;
    stats: {
      totalCommits: number;
      activeDays: number;
      currentStreak: number;
      longestStreak: number;
      lastAggregatedAt: string | null;
    } | null;
  }>;
  totalDailyActivities: number;
  lastAggregatedAt: string | null;
}

interface ProgressEvent {
  type: "progress" | "complete" | "error" | "rate_limit";
  data: {
    phase?: string;
    currentRepo?: string;
    currentMonth?: string;
    processedRepos?: number;
    totalRepos?: number;
    processedCommits?: number;
    totalCommits?: number;
    savedCommits?: number;
    message?: string;
    error?: string;
    rateLimit?: {
      remaining: number;
      limit: number;
      reset: string;
    };
  };
}

export default function ProfileStatsPage() {
  const [collectStatus, setCollectStatus] = useState<CollectStatus | null>(null);
  const [aggregateStatus, setAggregateStatus] = useState<AggregateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [aggregating, setAggregating] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent["data"] | null>(null);
  const [showRepos, setShowRepos] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [collectRes, aggregateRes] = await Promise.all([
        fetch("/api/console/profile-commits/collect"),
        fetch("/api/console/profile-commits/aggregate"),
      ]);

      if (collectRes.ok) {
        setCollectStatus(await collectRes.json());
      }
      if (aggregateRes.ok) {
        setAggregateStatus(await aggregateRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCollect = async () => {
    setCollecting(true);
    setProgress(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/console/profile-commits/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: "2022-01-01",
          includeDetails: false,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: ProgressEvent = JSON.parse(line.slice(6));
              setProgress(event.data);

              if (event.type === "complete") {
                toast.success(event.data.message || "수집 완료");
                fetchStatus();
              } else if (event.type === "error") {
                toast.error(event.data.error || "수집 중 오류 발생");
              }
            } catch {
              // JSON parse error, skip
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        toast.info("수집이 취소되었습니다.");
      } else {
        console.error("Collection error:", error);
        toast.error("수집 중 오류가 발생했습니다.");
      }
    } finally {
      setCollecting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelCollect = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("수집 로그를 초기화하면 다음 수집 시 모든 레포지토리+월 조합을 다시 수집합니다.\n진행하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch("/api/console/profile-commits/collect", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "로그 삭제 실패");
      }

      toast.success(data.message);
    } catch (error) {
      console.error("Clear logs error:", error);
      toast.error("수집 로그 초기화 중 오류가 발생했습니다.");
    }
  };

  const handleAggregate = async () => {
    setAggregating(true);

    try {
      const response = await fetch("/api/console/profile-commits/aggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "집계 실패");
      }

      toast.success(`${data.successCount}명의 통계가 집계되었습니다.`);
      fetchStatus();
    } catch (error) {
      console.error("Aggregate error:", error);
      toast.error("집계 중 오류가 발생했습니다.");
    } finally {
      setAggregating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "yyyy.MM.dd HH:mm", { locale: ko });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="프로필 통계 관리"
        description="멤버 프로필 페이지에 표시할 개발 활동 통계를 관리합니다."
      />

      <div className="space-y-6">
        {/* 커밋 수집 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              커밋 데이터 수집
            </CardTitle>
            <CardDescription>
              2022년 이후 studiobaton 조직의 모든 커밋을 수집합니다.
              초기 수집은 약 30분~1시간 소요될 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 현재 상태 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {collectStatus?.totalCommits?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">전체 커밋</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {collectStatus?.profileOnlyCommits?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">프로필 전용</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium">
                  {collectStatus?.oldestCommit
                    ? format(new Date(collectStatus.oldestCommit), "yy.MM.dd")
                    : "-"}
                </div>
                <div className="text-xs text-muted-foreground">최초 커밋</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium">
                  {collectStatus?.latestCommit
                    ? format(new Date(collectStatus.latestCommit), "yy.MM.dd")
                    : "-"}
                </div>
                <div className="text-xs text-muted-foreground">최근 커밋</div>
              </div>
            </div>

            {/* Rate Limit */}
            {collectStatus?.rateLimit && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="size-4" />
                GitHub API: {collectStatus.rateLimit.remaining} / {collectStatus.rateLimit.limit} 남음
                {collectStatus.rateLimit.remaining < 100 && (
                  <Badge variant="destructive" className="ml-2">
                    Rate Limit 주의
                  </Badge>
                )}
              </div>
            )}

            {/* 진행 상황 */}
            {collecting && progress && (
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium">{progress.message}</div>
                {progress.totalRepos && progress.totalRepos > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>레포지토리 진행률</span>
                      <span>
                        {progress.processedRepos || 0} / {progress.totalRepos}
                      </span>
                    </div>
                    <Progress
                      value={((progress.processedRepos || 0) / progress.totalRepos) * 100}
                    />
                  </div>
                )}
                {progress.currentRepo && (
                  <div className="text-xs text-muted-foreground">
                    현재: {progress.currentRepo} ({progress.currentMonth})
                  </div>
                )}
                {progress.savedCommits !== undefined && (
                  <div className="text-xs text-muted-foreground">
                    저장된 커밋: {progress.savedCommits?.toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2 flex-wrap">
              {collecting ? (
                <Button variant="destructive" onClick={handleCancelCollect}>
                  <AlertCircle className="size-4 mr-2" />
                  수집 중단
                </Button>
              ) : (
                <Button onClick={handleCollect}>
                  <Play className="size-4 mr-2" />
                  초기 수집 시작
                </Button>
              )}
              <Button variant="outline" onClick={fetchStatus} disabled={collecting}>
                <RefreshCw className="size-4 mr-2" />
                상태 새로고침
              </Button>
              <Button variant="ghost" onClick={handleClearLogs} disabled={collecting} className="text-muted-foreground">
                <Trash2 className="size-4 mr-2" />
                수집 로그 초기화
              </Button>
            </div>

            {/* 멤버별 커밋 현황 */}
            {collectStatus?.memberCommits && collectStatus.memberCommits.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">멤버별 커밋 현황</span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>멤버</TableHead>
                        <TableHead className="text-right">커밋 수</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collectStatus.memberCommits.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-xs text-muted-foreground">{member.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {member.commitCount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* 레포지토리 목록 */}
            {collectStatus?.repositories && collectStatus.repositories.length > 0 && (
              <div className="pt-4 border-t">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowRepos(!showRepos)}
                >
                  <FolderGit2 className="size-4" />
                  <span>레포지토리 목록 ({collectStatus.repositories.length}개)</span>
                  {showRepos ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>
                {showRepos && (
                  <div className="mt-3 border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>레포지토리</TableHead>
                          <TableHead className="text-right">커밋 수</TableHead>
                          <TableHead className="text-right">마지막 커밋</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {collectStatus.repositories.map((repo) => (
                          <TableRow key={repo.name}>
                            <TableCell className="font-medium">{repo.name}</TableCell>
                            <TableCell className="text-right">
                              {repo.commitCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">
                              {repo.lastCommitAt
                                ? format(new Date(repo.lastCommitAt), "yy.MM.dd", { locale: ko })
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 통계 집계 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              통계 집계
            </CardTitle>
            <CardDescription>
              수집된 커밋 데이터를 멤버별로 집계하여 일일 활동 및 프로필 통계를 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 집계 상태 */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                일일 활동 레코드: {aggregateStatus?.totalDailyActivities?.toLocaleString() || 0}개
              </span>
              {aggregateStatus?.lastAggregatedAt && (
                <span className="text-muted-foreground">
                  마지막 집계: {formatDate(aggregateStatus.lastAggregatedAt)}
                </span>
              )}
            </div>

            {/* 멤버별 상태 테이블 */}
            {aggregateStatus?.members && aggregateStatus.members.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>멤버</TableHead>
                      <TableHead className="text-center">커밋</TableHead>
                      <TableHead className="text-center">활동일</TableHead>
                      <TableHead className="text-center">스트릭</TableHead>
                      <TableHead className="text-center">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregateStatus.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {member.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {member.stats?.totalCommits?.toLocaleString() || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {member.stats?.activeDays || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {member.stats
                            ? `${member.stats.currentStreak} / ${member.stats.longestStreak}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {member.hasStats ? (
                            <CheckCircle2 className="size-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="size-4 text-orange-500 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2">
              <Button onClick={handleAggregate} disabled={aggregating}>
                {aggregating ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="size-4 mr-2" />
                )}
                전체 재집계
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
