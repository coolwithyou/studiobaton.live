"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { CalendarIcon, Loader2, Clock } from "lucide-react";
import { StandupForm } from "./_components/standup-form";
import { TaskList, Task } from "./_components/task-list";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  isLinked?: boolean;
}

interface StandupData {
  date: string;
  member: Member;
  standup: {
    id: string | null;
    tasks: Task[];
    carriedOverTasks: Task[];
  };
}

export default function StandupPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [standupData, setStandupData] = useState<StandupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialFetching, setInitialFetching] = useState(false);
  const hasLoadedRef = useRef(false);

  // 팀원 목록 조회
  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/console/members");
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

  // 스탠드업 데이터 조회
  const fetchStandup = useCallback(async (silent = false) => {
    if (!selectedMember) return;

    // 초기 로딩 시에만 스피너 표시
    if (!silent && !hasLoadedRef.current) {
      setInitialFetching(true);
    }

    try {
      const dateStr = formatKST(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/console/standup?date=${dateStr}&memberId=${selectedMember}`
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
  }, [selectedDate, selectedMember]);

  useEffect(() => {
    if (selectedMember) {
      // 날짜나 멤버가 변경되면 초기 로딩 상태로 리셋
      hasLoadedRef.current = false;
      fetchStandup();
    }
  }, [selectedMember, selectedDate, fetchStandup]);

  const handleTaskAdded = () => {
    // 백그라운드에서 데이터 갱신 (스피너 없이)
    fetchStandup(true);
  };

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
          <a href="/console/members" className="text-primary hover:underline">
            팀원 관리 페이지로 이동
          </a>
        </div>
      </div>
    );
  }

  const isToday =
    formatKST(selectedDate, "yyyy-MM-dd") === formatKST(new Date(), "yyyy-MM-dd");
  const tasks = standupData?.standup?.tasks || [];
  const carriedOverTasks = standupData?.standup?.carriedOverTasks || [];
  const allTasks = [...carriedOverTasks, ...tasks];
  const completedCount = allTasks.filter((t) => t.isCompleted).length;
  const totalCount = allTasks.length;

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="스탠드업"
        description="오늘의 업무 진행 계획을 공유하고 할일을 등록하세요."
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
                  memberId={selectedMember}
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
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
