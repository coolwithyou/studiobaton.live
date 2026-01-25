"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, User } from "lucide-react";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  githubName: string;
  isLinked: boolean;
}

interface SidebarMemberCardProps {
  members: Member[];
  currentGithubName: string;
}

export function SidebarMemberCard({
  members,
  currentGithubName,
}: SidebarMemberCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="size-4" />
          팀원 선택
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {members.map((member) => {
            const isActive = member.githubName === currentGithubName;

            return (
              <Link
                key={member.id}
                href={`/console/wrap-up/${member.githubName}`}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Avatar className="size-8">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium truncate">
                  {member.name}
                </span>
                {isActive && <Check className="size-4 shrink-0" />}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
