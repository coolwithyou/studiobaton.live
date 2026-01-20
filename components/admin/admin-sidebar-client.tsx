"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AdminSidebarNav } from "./admin-sidebar-nav";
import { AdminUserMenu } from "./admin-user-menu";
import type { MenuGroup } from "./admin-sidebar-config";
import type { UserRole } from "@/app/generated/prisma";

const STORAGE_KEY = "admin-sidebar-collapsed";

interface UserInfo {
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
}

interface AdminSidebarClientProps {
  menuGroups: MenuGroup[];
  userInfo: UserInfo;
  logoutAction: () => Promise<void>;
}

export function AdminSidebarClient({
  menuGroups,
  userInfo,
  logoutAction,
}: AdminSidebarClientProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 클라이언트 마운트 후 localStorage에서 상태 복원
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  };

  // hydration 불일치 방지
  if (!mounted) {
    return (
      <aside className="h-screen w-64 border-r bg-background flex flex-col">
        <div className="h-14 border-b flex items-center px-4">
          <span className="font-bold text-lg">studiobaton</span>
        </div>
      </aside>
    );
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "h-screen border-r bg-background flex flex-col transition-all duration-300 ease-in-out sticky top-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* 헤더 */}
        <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
          <Link
            href="/admin"
            className={cn(
              "font-bold text-lg transition-opacity",
              collapsed && "opacity-0 w-0 overflow-hidden"
            )}
          >
            studiobaton
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-8 w-8 shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* 네비게이션 */}
        <AdminSidebarNav groups={menuGroups} collapsed={collapsed} />

        {/* 사용자 메뉴 */}
        <AdminUserMenu
          userInfo={userInfo}
          collapsed={collapsed}
          logoutAction={logoutAction}
        />
      </aside>
    </TooltipProvider>
  );
}
