"use client";

import { useState } from "react";
import { SidebarMemberCard } from "./sidebar-member-card";
import { SidebarDateCard } from "./sidebar-date-card";
import { WrapUpContent } from "./wrap-up-content";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  githubName: string;
  isLinked: boolean;
}

interface WrapUpLayoutProps {
  members: Member[];
  currentMember: {
    id: string;
    name: string;
    githubName: string;
  };
}

export function WrapUpLayout({ members, currentMember }: WrapUpLayoutProps) {
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
        </div>

        {/* 랩업 콘텐츠 */}
        <WrapUpContent
          memberId={currentMember.id}
          memberGithubName={currentMember.githubName}
          selectedDate={selectedDate}
        />
      </main>
    </div>
  );
}
