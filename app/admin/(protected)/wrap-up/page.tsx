"use client";

import { useState, useEffect, useCallback } from "react";
import { formatKST } from "@/lib/date-utils";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Loader2, ListChecks, ExternalLink, RefreshCw } from "lucide-react";
import { StandupChecklist } from "./_components/standup-checklist";
import { CommitSummary } from "./_components/commit-summary";
import { CommitDiagnoseDialog } from "./_components/commit-diagnose-dialog";
import { CommitRepositoryGroup } from "../review/_components/commit-repository-group";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { toast } from "sonner";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

interface Member {
  id: string;
  name: string;
  githubName: string;
  avatarUrl: string | null;
  isLinked?: boolean;
}

interface Task {
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
}

interface StandupData {
  standup: {
    id: string;
    tasks: Task[];
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

export default function WrapUpPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [standupData, setStandupData] = useState<StandupData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialTabSet, setInitialTabSet] = useState(false);

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

  // 팀원 목록 조회
  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/members");
      const data = await response.json();
      const memberList = data.members || [];
      setMembers(memberList);

      if (memberList.length > 0) {
        setSelectedMember(memberList[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // 팀원인 경우 본인 탭으로 자동 이동 (최초 1회만)
  useEffect(() => {
    if (
      !initialTabSet &&
      userInfo?.role === "TEAM_MEMBER" &&
      userInfo.linkedMemberId &&
      members.length > 0
    ) {
      const myMember = members.find((m) => m.id === userInfo.linkedMemberId);
      if (myMember) {
        setSelectedMember(myMember.id);
        setInitialTabSet(true);
      }
    }
  }, [userInfo, members, initialTabSet]);

  // 커밋 새로고침 핸들러
  const handleRefreshCommits = async () => {
    if (!selectedMember) return;

    setRefreshing(true);
    try {
      const dateStr = formatKST(selectedDate, "yyyy-MM-dd");
      const response = await fetch("/api/member/commits/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMember, date: dateStr }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "커밋 새로고침 실패");
        return;
      }

      if (result.addedCount > 0) {
        toast.success(`${result.addedCount}개의 새 커밋을 가져왔습니다.`);
        // 데이터 새로고침
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
    (userInfo.role === "TEAM_MEMBER" && userInfo.linkedMemberId === selectedMember)
  );

  // 스탠드업 + 커밋 리뷰 데이터 조회
  const fetchData = useCallback(async () => {
    if (!selectedMember) return;

    setFetching(true);
    try {
      const dateStr = formatKST(selectedDate, "yyyy-MM-dd");

      // 병렬 요청
      const [standupRes, reviewRes] = await Promise.all([
        fetch(`/api/admin/standup?date=${dateStr}&memberId=${selectedMember}`),
        fetch(`/api/admin/review?date=${dateStr}&memberId=${selectedMember}`),
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
  }, [selectedDate, selectedMember]);

  useEffect(() => {
    if (selectedMember) {
      fetchData();
    }
  }, [selectedMember, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">팀원이 등록되지 않았습니다</h2>
          <p className="text-muted-foreground mb-4">
            팀원 관리 페이지에서 팀원을 먼저 등록해주세요.
          </p>
          <a href="/admin/members" className="text-primary hover:underline">
            팀원 관리 페이지로 이동
          </a>
        </div>
      </div>
    );
  }

  const isToday =
    formatKST(selectedDate, "yyyy-MM-dd") === formatKST(new Date(), "yyyy-MM-dd");
  const tasks = standupData?.standup?.tasks || [];
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

  return (
    <PageContainer maxWidth="2xl">
      <PageHeader
        title="랩업"
        description="오늘 하루도 고생 많으셨습니다!"
      />

      {/* 날짜 선택 */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium">날짜 선택:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[240px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 size-4" />
              {formatKST(selectedDate, "PPP")}
              {isToday && (
                <span className="ml-2 text-xs text-muted-foreground">(오늘)</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) =>
                date > new Date() || date < new Date("2020-01-01")
              }
              initialFocus
              locale={ko}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 팀원 탭 */}
      <Tabs value={selectedMember} onValueChange={setSelectedMember}>
        <TabsList className="w-full justify-start">
          {members.map((member) => (
            <TabsTrigger key={member.id} value={member.id} className="gap-2">
              <Avatar className="size-5">
                <AvatarImage src={member.avatarUrl || undefined} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
              </Avatar>
              <span>{member.name}</span>
              {member.isLinked && <VerifiedBadge memberName={member.name} />}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedMember} className="mt-6">
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
                  <StandupChecklist tasks={tasks} />
                </CardContent>
              </Card>

              {/* AI 커밋 하이라이트 */}
              <CommitSummary
                date={selectedDate}
                memberId={selectedMember}
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

              {!hasCommits && (() => {
                const selectedMemberData = members.find((m) => m.id === selectedMember);
                const githubSearchUrl = selectedMemberData?.githubName
                  ? `https://github.com/search?q=org:studiobaton+author:${selectedMemberData.githubName}+committer-date:${formatKST(selectedDate, "yyyy-MM-dd")}&type=commits`
                  : null;

                return (
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
                        {selectedMemberData && (
                          <CommitDiagnoseDialog
                            memberId={selectedMember}
                            memberName={selectedMemberData.name}
                            date={selectedDate}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
