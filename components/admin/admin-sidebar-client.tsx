"use client";

import { useCallback, useSyncExternalStore } from "react";
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

// 클라이언트 마운트 감지를 위한 훅
function useMounted() {
  const getSnapshot = () => true;
  const getServerSnapshot = () => false;
  const subscribe = () => () => {};

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// localStorage 상태를 동기화하기 위한 훅
function useLocalStorageState(key: string, defaultValue: boolean) {
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return defaultValue;
    const stored = localStorage.getItem(key);
    return stored === null ? defaultValue : stored === "true";
  }, [key, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const subscribe = useCallback(
    (callback: () => void) => {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key) callback();
      };
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    },
    [key]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (newValue: boolean | ((prev: boolean) => boolean)) => {
      const resolved =
        typeof newValue === "function" ? newValue(getSnapshot()) : newValue;
      localStorage.setItem(key, String(resolved));
      // storage 이벤트는 같은 윈도우에서 발생하지 않으므로 수동 dispatch
      window.dispatchEvent(
        new StorageEvent("storage", { key, newValue: String(resolved) })
      );
    },
    [key, getSnapshot]
  );

  return [value, setValue] as const;
}

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
  const mounted = useMounted();
  const [collapsed, setCollapsed] = useLocalStorageState(STORAGE_KEY, false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, [setCollapsed]);

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
