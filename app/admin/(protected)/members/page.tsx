"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberForm } from "./_components/member-form";
import { MemberList } from "./_components/member-list";

export interface Member {
  id: string;
  name: string;
  githubName: string;
  email: string;
  avatarUrl: string | null;
  isActive: boolean;
  displayOrder: number;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      // 관리자 페이지에서는 비활성 팀원도 조회
      const response = await fetch("/api/admin/members?includeInactive=true");
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">팀원 관리</h1>
        <p className="text-muted-foreground mt-1">
          커밋 리뷰에 사용할 팀원 정보를 관리합니다.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          로딩 중...
        </div>
      ) : (
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">
              팀원 목록 ({members.length})
            </TabsTrigger>
            <TabsTrigger value="add">
              팀원 추가
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <MemberList
              members={members}
              onMemberChange={fetchMembers}
            />
          </TabsContent>

          <TabsContent value="add">
            <MemberForm
              onMemberChange={fetchMembers}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
