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
import { CalendarIcon, Loader2, Sun } from "lucide-react";
import { StandupForm } from "./_components/standup-form";
import { TaskList } from "./_components/task-list";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Task {
  id: string;
  content: string;
  repository: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  displayOrder: number;
}

interface StandupData {
  date: string;
  member: Member;
  standup: {
    id: string;
    tasks: Task[];
  } | null;
}

export default function StandupPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [standupData, setStandupData] = useState<StandupData | null>(null);
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

  // 스탠드업 데이터 조회
  const fetchStandup = useCallback(async () => {
    if (!selectedMember) return;

    setFetching(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/admin/standup?date=${dateStr}&memberId=${selectedMember}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch standup data");
      }

      setStandupData(data);
    } catch (error) {
      console.error("Failed to fetch standup:", error);
      setStandupData(null);
    } finally {
      setFetching(false);
    }
  }, [selectedDate, selectedMember]);

  useEffect(() => {
    if (selectedMember) {
      fetchStandup();
    }
  }, [selectedMember, fetchStandup]);

  const handleTaskAdded = () => {
    fetchStandup();
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
  const completedCount = tasks.filter((t) => t.isCompleted).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sun className="size-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">스탠드업</h1>
        </div>
        <p className="text-muted-foreground">
          오늘 할 일을 등록하고 팀과 공유하세요. @로 레포지토리를 참조할 수 있습니다.
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
              {tasks.length > 0 && (
                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg text-sm">
                  <span>
                    총 <strong>{tasks.length}</strong>개
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-green-600">
                    완료 <strong>{completedCount}</strong>개
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-orange-600">
                    남음 <strong>{tasks.length - completedCount}</strong>개
                  </span>
                </div>
              )}

              {/* 할 일 목록 */}
              <div>
                <h3 className="text-sm font-medium mb-3">오늘의 할 일</h3>
                <TaskList tasks={tasks} onTaskUpdated={handleTaskAdded} />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
