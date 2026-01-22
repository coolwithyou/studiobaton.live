"use client"

import {
  Home,
  LayoutDashboard,
  BarChart3,
  PenSquare,
  Wand2,
  Menu,
  MessageSquare,
  CheckSquare,
  GitCommit,
  FolderGit2,
  FolderKanban,
  UserCog,
  Users,
  Shield,
  ShieldCheck,
  ExternalLink,
  Globe,
  Settings,
  HelpCircle,
  FileText,
  Newspaper,
  ClipboardList,
  Sun,
  Sunset,
  CalendarDays,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { NavItem, IconName } from "./sidebar-config"

// 아이콘 이름 → 컴포넌트 매핑
const ICON_MAP: Record<IconName, LucideIcon> = {
  Home,
  LayoutDashboard,
  BarChart3,
  PenSquare,
  Wand2,
  Menu,
  MessageSquare,
  CheckSquare,
  GitCommit,
  FolderGit2,
  FolderKanban,
  UserCog,
  Users,
  Shield,
  ShieldCheck,
  ExternalLink,
  Globe,
  Settings,
  HelpCircle,
  FileText,
  Newspaper,
  ClipboardList,
  Sun,
  Sunset,
  CalendarDays,
}

interface NavSecondaryProps {
  items: NavItem[]
  className?: string
}

/**
 * 경로 활성화 여부 판단
 * - 하위 경로도 활성화 (예: /console/projects/123 → /console/projects 메뉴 활성화)
 */
function isPathActive(pathname: string, menuUrl: string): boolean {
  if (pathname === menuUrl) return true
  // 하위 경로 매칭: menuUrl로 시작하고 그 다음이 / 또는 끝인 경우
  return new RegExp(`^${menuUrl}(/|$)`).test(pathname)
}

export function NavSecondary({ items, className }: NavSecondaryProps) {
  const pathname = usePathname()

  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const IconComponent = ICON_MAP[item.icon]

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={isPathActive(pathname, item.url)}
                  tooltip={item.title}
                >
                  {item.external ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {IconComponent && <IconComponent />}
                      <span>{item.title}</span>
                    </a>
                  ) : (
                    <Link href={item.url}>
                      {IconComponent && <IconComponent />}
                      <span>{item.title}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
