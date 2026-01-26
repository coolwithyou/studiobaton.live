"use client";

import { useState } from "react";
import { SidebarMemberCard } from "./sidebar-member-card";
import { SidebarDateCard } from "./sidebar-date-card";
import { SidebarSyncCard } from "./sidebar-sync-card";
import { StandupContent } from "./standup-content";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  githubName: string;
  isLinked: boolean;
}

interface StandupLayoutProps {
  members: Member[];
  currentMember: {
    id: string;
    name: string;
    githubName: string;
  };
}

export function StandupLayout({ members, currentMember }: StandupLayoutProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  return (
    <div className="flex gap-6">
      {/* 좌측 사이드 패널 */}
      <aside className="w-64 shrink-0 space-y-4 hidden lg:block">
        <SidebarMemberCard
          members={members}
          currentGithubName={currentMember.githubName}
        />
        <SidebarDateCard
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
        <SidebarSyncCard />
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 min-w-0">
        {/* 모바일용 컴팩트 헤더 */}
        <div className="lg:hidden mb-6 space-y-4">
          <SidebarMemberCard
            members={members}
            currentGithubName={currentMember.githubName}
          />
          <SidebarDateCard
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
          <SidebarSyncCard />
        </div>

        {/* 스탠드업 콘텐츠 */}
        <StandupContent
          memberId={currentMember.id}
          githubName={currentMember.githubName}
          selectedDate={selectedDate}
        />
      </main>
    </div>
  );
}
