"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
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
import { CalendarIcon, Loader2, Moon, ListChecks } from "lucide-react";
import { StandupChecklist } from "./_components/standup-checklist";
import { CommitSummary } from "./_components/commit-summary";
import { CommitRepositoryGroup } from "../review/_components/commit-repository-group";
import { VerifiedBadge } from "@/components/ui/verified-badge";

interface Member {
  id: string;
  name: string;
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

export default function WrapUpPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [standupData, setStandupData] = useState<StandupData | null>(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

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

  // 스탠드업 + 커밋 리뷰 데이터 조회
  const fetchData = useCallback(async () => {
    if (!selectedMember) return;

    setFetching(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

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
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const tasks = standupData?.standup?.tasks || [];
  const hasCommits = (reviewData?.summary?.totalCommits || 0) > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">랩업</h1>
        </div>
        <p className="text-muted-foreground">
          오늘 하루도 고생 많으셨습니다!
        </p>
      </div>

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
              {format(selectedDate, "PPP", { locale: ko })}
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
                  <StandupChecklist tasks={tasks} onTaskUpdated={fetchData} />
                </CardContent>
              </Card>

              {/* AI 커밋 하이라이트 */}
              <CommitSummary
                date={selectedDate}
                memberId={selectedMember}
                hasCommits={hasCommits}
              />

              {/* 커밋 상세 리뷰 */}
              {hasCommits && reviewData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">커밋 상세</h2>
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
                    <p className="text-center text-muted-foreground">
                      이 날짜에는 커밋이 없습니다.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
