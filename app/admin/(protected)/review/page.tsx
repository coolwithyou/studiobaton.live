"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { DatePickerSection } from "./_components/date-picker-section";
import { MemberTabs } from "./_components/member-tabs";
import { CommitRepositoryGroup } from "./_components/commit-repository-group";
import { Loader2 } from "lucide-react";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
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
  date: string;
  member: Member;
  repositories: Repository[];
  summary: {
    totalCommits: number;
    totalAdditions: number;
    totalDeletions: number;
  };
}

export default function ReviewPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
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

      // 첫 번째 팀원 자동 선택
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

  // 리뷰 데이터 조회
  const fetchReview = useCallback(async () => {
    if (!selectedMember) return;

    setFetching(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/admin/review?date=${dateStr}&memberId=${selectedMember}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch review data");
      }

      setReviewData(data);
    } catch (error) {
      console.error("Failed to fetch review:", error instanceof Error ? error.message : error);
      setReviewData(null);
    } finally {
      setFetching(false);
    }
  }, [selectedDate, selectedMember]);

  // 날짜 또는 팀원 변경 시 데이터 조회
  useEffect(() => {
    if (selectedMember) {
      fetchReview();
    }
  }, [selectedMember, fetchReview]);

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
          <a
            href="/admin/members"
            className="text-primary hover:underline"
          >
            팀원 관리 페이지로 이동 →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">커밋 리뷰</h1>
        <p className="text-muted-foreground mt-1">
          팀원별 일일 커밋 내역을 확인합니다.
        </p>
      </div>

      <DatePickerSection
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <div className="mt-6">
        <MemberTabs
          members={members}
          selectedMember={selectedMember}
          onMemberChange={setSelectedMember}
        >
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : reviewData && reviewData.repositories.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">전체 커밋:</span>{" "}
                  {reviewData.summary.totalCommits}
                </div>
                <div className="text-sm">
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
                <CommitRepositoryGroup
                  key={repo.name}
                  repository={repo}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              이 날짜에는 커밋이 없습니다.
            </div>
          )}
        </MemberTabs>
      </div>
    </div>
  );
}
