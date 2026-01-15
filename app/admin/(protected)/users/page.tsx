"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "./_components/user-list";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "ADMIN" | "TEAM_MEMBER" | "ORG_MEMBER";
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending">("all");

  const fetchUsers = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) {
        params.set("status", status);
      }
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(filter === "pending" ? "PENDING" : undefined);
  }, [fetchUsers, filter]);

  const pendingCount = users.filter((u) => u.status === "PENDING").length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <p className="text-muted-foreground mt-1">
          시스템 사용자의 역할과 상태를 관리합니다.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
      ) : (
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "pending")}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="all">전체 사용자 ({users.length})</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              승인 대기
              {filter === "all" && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <UserList
              users={users}
              onUserChange={() => fetchUsers()}
            />
          </TabsContent>

          <TabsContent value="pending">
            <UserList
              users={users.filter((u) => u.status === "PENDING")}
              onUserChange={() => fetchUsers("PENDING")}
              showPendingActions
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
