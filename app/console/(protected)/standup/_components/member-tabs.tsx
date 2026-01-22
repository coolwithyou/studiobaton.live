"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  isLinked: boolean;
}

interface MemberTabsProps {
  members: Member[];
  currentMemberId: string;
  basePath: string; // "/console/standup" 또는 "/console/wrap-up"
}

export function MemberTabs({ members, currentMemberId, basePath }: MemberTabsProps) {
  const router = useRouter();

  const handleMemberChange = (memberId: string) => {
    router.push(`${basePath}/${memberId}`);
  };

  return (
    <Tabs value={currentMemberId} onValueChange={handleMemberChange}>
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
    </Tabs>
  );
}
