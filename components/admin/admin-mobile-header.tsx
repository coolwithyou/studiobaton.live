"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminSidebarNav } from "./admin-sidebar-nav";
import { AdminUserMenu } from "./admin-user-menu";
import type { MenuGroup } from "./admin-sidebar-config";
import type { UserRole } from "@/app/generated/prisma";

interface UserInfo {
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
}

interface AdminMobileHeaderProps {
  menuGroups: MenuGroup[];
  userInfo: UserInfo;
  logoutAction: () => Promise<void>;
}

export function AdminMobileHeader({
  menuGroups,
  userInfo,
  logoutAction,
}: AdminMobileHeaderProps) {
  const [open, setOpen] = useState(false);

  const handleItemClick = () => {
    setOpen(false);
  };

  return (
    <header className="lg:hidden sticky top-0 z-50 border-b bg-background">
      <div className="flex h-14 items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">메뉴 열기</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="h-14 border-b flex items-center justify-start px-4">
              <SheetTitle className="text-lg font-bold">studiobaton</SheetTitle>
            </SheetHeader>
            <TooltipProvider>
              <AdminSidebarNav
                groups={menuGroups}
                collapsed={false}
                onItemClick={handleItemClick}
              />
              <AdminUserMenu
                userInfo={userInfo}
                collapsed={false}
                logoutAction={logoutAction}
              />
            </TooltipProvider>
          </SheetContent>
        </Sheet>

        <Link href="/admin" className="font-bold text-lg">
          studiobaton log
        </Link>
      </div>
    </header>
  );
}
