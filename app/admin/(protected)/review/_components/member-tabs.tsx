"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface MemberTabsProps {
  members: Member[];
  selectedMember: string;
  onMemberChange: (memberId: string) => void;
  children: React.ReactNode;
}

export function MemberTabs({
  members,
  selectedMember,
  onMemberChange,
  children,
}: MemberTabsProps) {
  return (
    <Tabs value={selectedMember} onValueChange={onMemberChange}>
      <TabsList className="w-full justify-start">
        {members.map((member) => (
          <TabsTrigger
            key={member.id}
            value={member.id}
            className="gap-2"
          >
            <Avatar className="size-5">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback>{member.name[0]}</AvatarFallback>
            </Avatar>
            <span>{member.name}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={selectedMember} className="mt-6">
        {children}
      </TabsContent>
    </Tabs>
  );
}
