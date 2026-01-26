"use client";

import { useState } from "react";
import Image from "next/image";
import { Github, GitCommit, FolderGit2, RefreshCw, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditProfileDialog } from "./edit-profile-dialog";
import { ExternalReposSection } from "./external-repos-section";
import { toast } from "sonner";

interface MemberProfileSidebarProps {
  member: {
    id: string;
    name: string;
    githubName: string;
    email: string;
    avatarUrl: string | null;
    profileImageUrl: string | null;
    bio: string | null;
    title: string | null;
    role: string | null;
    externalRepos: string[];
  };
  stats: {
    totalCommits: number;
    repoCount: number;
  };
  canEdit?: boolean;
  isAdmin?: boolean;
}

export function MemberProfileSidebar({
  member,
  stats,
  canEdit = false,
  isAdmin = false,
}: MemberProfileSidebarProps) {
  const [isAggregating, setIsAggregating] = useState(false);

  const handleReaggregate = async () => {
    if (isAggregating) return;

    setIsAggregating(true);
    try {
      const response = await fetch("/api/console/profile-commits/aggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "member", memberId: member.id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("통계 재집계 완료", {
          description: `${member.name}의 통계가 성공적으로 업데이트되었습니다.`,
        });
        // 페이지 새로고침하여 최신 데이터 반영
        window.location.reload();
      } else {
        throw new Error(result.error || "재집계 중 오류가 발생했습니다.");
      }
    } catch (error) {
      toast.error("재집계 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setIsAggregating(false);
    }
  };

  return (
    <aside className="w-full lg:w-[280px] lg:shrink-0 space-y-4">
      {/* 3:4 프로필 이미지 */}
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted">
        {member.profileImageUrl ? (
          <Image
            src={member.profileImageUrl}
            alt={member.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 280px"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Avatar className="w-24 h-24">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback className="text-4xl">
                {member.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* 이름 + GitHub 닉네임 */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {/* 1:1 아바타 (작게) */}
          <Avatar className="w-10 h-10">
            <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
            <AvatarFallback>{member.name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold leading-tight">{member.name}</h1>
            <p className="text-muted-foreground text-sm">@{member.githubName}</p>
          </div>
        </div>
      </div>

      {/* Edit profile 버튼 */}
      {canEdit && (
        <EditProfileDialog member={member} isAdmin={isAdmin}>
          <Button variant="outline" className="w-full">
            Edit profile
          </Button>
        </EditProfileDialog>
      )}

      {/* 외부 레포지토리 섹션 */}
      <ExternalReposSection
        githubName={member.githubName}
        externalRepos={member.externalRepos}
        canEdit={canEdit}
      />

      {/* Bio */}
      {member.bio && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {member.bio}
        </p>
      )}

      {/* 직함/역할 */}
      {(member.title || member.role) && (
        <div className="flex flex-wrap items-center gap-2">
          {member.title && (
            <span className="text-sm">{member.title}</span>
          )}
          {member.role && (
            <Badge variant="secondary" className="text-xs">
              {member.role}
            </Badge>
          )}
        </div>
      )}

      {/* 통계 요약 */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground py-2">
        <div className="flex items-center gap-1.5">
          <GitCommit className="w-4 h-4" />
          <span className="font-medium text-foreground">{stats.totalCommits.toLocaleString()}</span>
          <span>커밋</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FolderGit2 className="w-4 h-4" />
          <span className="font-medium text-foreground">{stats.repoCount}</span>
          <span>레포지토리</span>
        </div>
      </div>

      {/* GitHub 프로필 링크 */}
      <Button variant="outline" size="sm" className="w-full" asChild>
        <a
          href={`https://github.com/${member.githubName}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github className="w-4 h-4 mr-2" />
          GitHub 프로필
        </a>
      </Button>

      {/* 관리자 전용: 통계 재집계 버튼 */}
      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={handleReaggregate}
          disabled={isAggregating}
        >
          {isAggregating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {isAggregating ? "재집계 중..." : "통계 재집계"}
        </Button>
      )}
    </aside>
  );
}
