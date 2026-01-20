"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  PenSquare,
  Wand2,
  Menu,
  MessageSquare,
  CheckSquare,
  GitCommit,
  FolderGit2,
  UserCog,
  Shield,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollableContainer } from "@/components/ui/scrollable-container";
import type { MenuGroup, MenuItem, IconName } from "./admin-sidebar-config";
import { EXTERNAL_LINK } from "./admin-sidebar-config";

// 아이콘 이름 → 아이콘 컴포넌트 매핑
const ICON_MAP: Record<IconName, LucideIcon> = {
  Home,
  BarChart3,
  PenSquare,
  Wand2,
  Menu,
  MessageSquare,
  CheckSquare,
  GitCommit,
  FolderGit2,
  UserCog,
  Shield,
  ExternalLink,
};

interface AdminSidebarNavProps {
  groups: MenuGroup[];
  collapsed: boolean;
  onItemClick?: () => void;
}

export function AdminSidebarNav({
  groups,
  collapsed,
  onItemClick,
}: AdminSidebarNavProps) {
  const pathname = usePathname();

  // 현재 경로와 메뉴 href 비교
  const isActive = (href: string): boolean => {
    if (href.startsWith("http")) return false;
    // 정확한 경로 매칭 (단, /admin은 정확히 매칭)
    if (href === "/admin") {
      return pathname === "/admin";
    }
    // 하위 경로도 활성화 (예: /admin/stats/developers -> /admin/stats 활성화)
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.href);
    const Icon = ICON_MAP[item.icon];

    const linkContent = (
      <Link
        href={item.href}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
        onClick={onItemClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          active && "bg-primary/10 text-primary font-medium",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.external && <span className="text-xs opacity-60">↗</span>}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  };

  return (
    <ScrollableContainer
      className="flex-1 py-4"
      autoHide="leave"
      autoHideDelay={400}
    >
      <div className="space-y-6 px-3">
        {groups.map((group) => (
          <div key={group.id}>
            {!collapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">{group.items.map(renderMenuItem)}</div>
          </div>
        ))}

        {/* 사이트 보기 링크 */}
        <div className="pt-2 border-t">
          {renderMenuItem(EXTERNAL_LINK)}
        </div>
      </div>
    </ScrollableContainer>
  );
}
