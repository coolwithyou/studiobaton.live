"use client";

import { useState, useEffect, useCallback } from "react";
import { formatKST } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ListChecks, ExternalLink, RefreshCw } from "lucide-react";
import { StandupChecklist } from "./standup-checklist";
import { CommitSummary } from "./commit-summary";
import { CommitDiagnoseDialog } from "./commit-diagnose-dialog";
import { CommitRepositoryGroup } from "../../review/_components/commit-repository-group";
import { toast } from "sonner";

interface Task {
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
  dueDate?: string;
  originalDueDate?: string;
}

interface StandupData {
  standup: {
    id: string;
    tasks: Task[];
    carriedOverTasks: Task[];
  } | null;
}

interface CommitFile {
  id: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
}

interface Commit {
  sha: string;
  message: string;
  committedAt: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  url: string;
  files: CommitFile[];
}

interface Repository {
  name: string;
  displayName: string | null;
  commits: Commit[];
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
}

interface ReviewData {
  repositories: Repository[];
  summary: {
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
  };
}

interface UserInfo {
  id: string;
  role: "ADMIN" | "TEAM_MEMBER" | "ORG_MEMBER";
  linkedMemberId: string | null;
}

interface WrapUpContentProps {
  memberId: string;
  memberGithubName: string;
  selectedDate: Date;
}

export function WrapUpContent({ memberId, memberGithubName, selectedDate }: WrapUpContentProps) {
  const [standupData, setStandupData] = useState<StandupData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 현재 사용자 정보 조회
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const data = await response.json();
          setUserInfo(data);
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      }
    };
    fetchUserInfo();
  }, []);

  // 커밋 새로고침 핸들러
  const handleRefreshCommits = async () => {
    setRefreshing(true);
    try {
      const dateStr = formatKST(selectedDate, "yyyy-MM-dd");
      const response = await fetch("/api/member/commits/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, date: dateStr }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "커밋 새로고침 실패");
        return;
      }

      if (result.addedCount > 0) {
        toast.success(`${result.addedCount}개의 새 커밋을 가져왔습니다.`);
        fetchData();
      } else {
        toast.info("새로운 커밋이 없습니다.");
      }
    } catch (error) {
      console.error("Failed to refresh commits:", error);
      toast.error("커밋 새로고침 중 오류가 발생했습니다.");
    } finally {
      setRefreshing(false);
    }
  };

  // 새로고침 버튼 표시 여부
  const canRefreshCommits = userInfo && (
    userInfo.role === "ADMIN" ||
    (userInfo.role === "TEAM_MEMBER" && userInfo.linkedMemberId === memberId)
  );

  // 스탠드업 + 커밋 리뷰 데이터 조회
  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const dateStr = formatKST(selectedDate, "yyyy-MM-dd");

      // 병렬 요청
      const [standupRes, reviewRes] = await Promise.all([
        fetch(`/api/console/standup?date=${dateStr}&memberId=${memberId}`),
        fetch(`/api/console/review?date=${dateStr}&memberId=${memberId}`),
      ]);

      const [standupJson, reviewJson] = await Promise.all([
        standupRes.json(),
        reviewRes.json(),
      ]);

      if (standupRes.ok) {
        setStandupData(standupJson);
      }

      if (reviewRes.ok) {
        setReviewData(reviewJson);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setFetching(false);
    }
  }, [selectedDate, memberId]);

  // memberId 또는 날짜 변경 시 데이터 재조회
  useEffect(() => {
    setStandupData(null);
    setReviewData(null);
    fetchData();
  }, [memberId, selectedDate, fetchData]);

  const isToday =
    formatKST(selectedDate, "yyyy-MM-dd") === formatKST(new Date(), "yyyy-MM-dd");
  const tasks = standupData?.standup?.tasks || [];
  const carriedOverTasks = standupData?.standup?.carriedOverTasks || [];
  const hasCommits = (reviewData?.summary?.totalCommits || 0) > 0;

  // 커밋 해시 -> 리포지토리명 매핑 생성
  const commitHashToRepo = new Map<string, string>();
  if (reviewData?.repositories) {
    for (const repo of reviewData.repositories) {
      const displayName = repo.displayName || repo.name;
      for (const commit of repo.commits) {
        commitHashToRepo.set(commit.sha.slice(0, 7), displayName);
      }
    }
  }

  const githubSearchUrl = memberGithubName
    ? `https://github.com/search?q=org:studiobaton+author:${memberGithubName}+committer-date:${formatKST(selectedDate, "yyyy-MM-dd")}&type=commits`
    : null;

  return (
    <div className="space-y-6">
      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 스탠드업 체크리스트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="size-5 text-green-500" />
                스탠드업 할 일
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StandupChecklist tasks={tasks} carriedOverTasks={carriedOverTasks} />
            </CardContent>
          </Card>

          {/* AI 커밋 하이라이트 */}
          <CommitSummary
            date={selectedDate}
            memberId={memberId}
            hasCommits={hasCommits}
            commitHashToRepo={commitHashToRepo}
          />

          {/* 커밋 상세 리뷰 */}
          {hasCommits && reviewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">커밋 상세</h2>
                  {canRefreshCommits && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshCommits}
                      disabled={refreshing}
                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                      {refreshing ? "가져오는 중..." : "새로고침"}
                    </Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="text-green-600">
                    +{reviewData.summary.totalAdditions}
                  </span>
                  {" / "}
                  <span className="text-red-600">
                    -{reviewData.summary.totalDeletions}
                  </span>
                </div>
              </div>

              {reviewData.repositories.map((repo) => (
                <CommitRepositoryGroup key={repo.name} repository={repo} />
              ))}
            </div>
          )}

          {!hasCommits && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground mb-4">
                  이 날짜에는 커밋이 없습니다.
                </p>
                <div className="flex items-center justify-center gap-3">
                  {canRefreshCommits && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleRefreshCommits}
                      disabled={refreshing}
                      className="gap-1.5"
                    >
                      <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                      {refreshing ? "가져오는 중..." : "내 커밋 가져오기"}
                    </Button>
                  )}
                  {githubSearchUrl && (
                    <a
                      href={githubSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ExternalLink className="size-4" />
                        GitHub에서 확인
                      </Button>
                    </a>
                  )}
                  <CommitDiagnoseDialog
                    memberId={memberId}
                    memberName=""
                    date={selectedDate}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
