"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, X, Trash2 } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { User } from "../page";

interface UserListProps {
  users: User[];
  onUserChange: () => void;
  showPendingActions?: boolean;
}

const ROLE_LABELS: Record<User["role"], string> = {
  ADMIN: "관리자",
  TEAM_MEMBER: "팀원",
  ORG_MEMBER: "바토너",
};

const STATUS_LABELS: Record<User["status"], string> = {
  PENDING: "승인 대기",
  ACTIVE: "활성",
  INACTIVE: "비활성",
};

const STATUS_VARIANTS: Record<User["status"], "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  ACTIVE: "default",
  INACTIVE: "destructive",
};

export function UserList({ users, onUserChange, showPendingActions }: UserListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "승인에 실패했습니다.");
        return;
      }

      onUserChange();
    } catch (error) {
      console.error("Failed to approve user:", error);
      alert("승인에 실패했습니다.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoadingId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}/reject`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "거절에 실패했습니다.");
        return;
      }

      onUserChange();
    } catch (error) {
      console.error("Failed to reject user:", error);
      alert("거절에 실패했습니다.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "삭제에 실패했습니다.");
        return;
      }

      onUserChange();
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("삭제에 실패했습니다.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    setLoadingId(id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "역할 변경에 실패했습니다.");
        return;
      }

      onUserChange();
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("역할 변경에 실패했습니다.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "상태 변경에 실패했습니다.");
        return;
      }

      onUserChange();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("상태 변경에 실패했습니다.");
    } finally {
      setLoadingId(null);
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {showPendingActions ? "승인 대기 중인 사용자가 없습니다." : "등록된 사용자가 없습니다."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => {
        const isInternal = user.email.endsWith("@ba-ton.kr");
        const isLoading = loadingId === user.id;

        return (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-card"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback>
                  {(user.name || user.email)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {user.name || user.email.split("@")[0]}
                  </span>
                  {user.linkedMember && (
                    <VerifiedBadge memberName={user.linkedMember.name} />
                  )}
                  <Badge variant={STATUS_VARIANTS[user.status]}>
                    {STATUS_LABELS[user.status]}
                  </Badge>
                  {isInternal && (
                    <Badge variant="outline" className="text-xs">내부</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.email}
                  {user.linkedMember && (
                    <span className="text-blue-500"> · @{user.linkedMember.githubName}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  가입: {format(new Date(user.createdAt), "yyyy.MM.dd", { locale: ko })}
                  {user.approvedAt && (
                    <> · 승인: {format(new Date(user.approvedAt), "yyyy.MM.dd", { locale: ko })}</>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {showPendingActions && user.status === "PENDING" ? (
                // 승인 대기 빠른 액션
                <>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(user.id)}
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(user.id)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    거절
                  </Button>
                </>
              ) : (
                // 역할/상태 변경
                <>
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">관리자</SelectItem>
                      <SelectItem value="TEAM_MEMBER">팀원</SelectItem>
                      <SelectItem value="ORG_MEMBER">바토너</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={user.status}
                    onValueChange={(value) => handleStatusChange(user.id, value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">활성</SelectItem>
                      <SelectItem value="INACTIVE">비활성</SelectItem>
                      <SelectItem value="PENDING">대기</SelectItem>
                    </SelectContent>
                  </Select>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          {user.name || user.email} 사용자를 삭제하시겠습니까?
                          <br />
                          이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(user.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
