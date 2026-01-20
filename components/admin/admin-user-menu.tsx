"use client";

import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/app/generated/prisma";

interface UserInfo {
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
}

interface AdminUserMenuProps {
  userInfo: UserInfo;
  collapsed: boolean;
  logoutAction: () => Promise<void>;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "관리자",
  TEAM_MEMBER: "팀원",
  ORG_MEMBER: "멤버",
};

export function AdminUserMenu({
  userInfo,
  collapsed,
  logoutAction,
}: AdminUserMenuProps) {
  const displayName = userInfo.name || userInfo.email.split("@")[0];

  if (collapsed) {
    return (
      <div className="border-t p-2 space-y-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="flex justify-center">
              {userInfo.image ? (
                <img
                  src={userInfo.image}
                  alt={displayName}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="text-sm">
              <p className="font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{userInfo.email}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[userInfo.role]}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        <div className="flex justify-center">
          <ThemeToggle />
        </div>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <form action={logoutAction} className="w-full">
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="w-full h-9"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </TooltipTrigger>
          <TooltipContent side="right">로그아웃</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="border-t p-3 space-y-3">
      {/* 사용자 정보 */}
      <div className="flex items-center gap-3">
        {userInfo.image ? (
          <img
            src={userInfo.image}
            alt={displayName}
            className="h-8 w-8 rounded-full shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {ROLE_LABELS[userInfo.role]}
          </p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <form action={logoutAction} className="flex-1">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </form>
      </div>
    </div>
  );
}
