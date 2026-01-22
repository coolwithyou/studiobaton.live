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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { NavGroup, IconName } from "./sidebar-config"

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

interface NavMainProps {
  groups: NavGroup[]
}

/**
 * 경로 활성화 여부 판단
 * - /console/standup, /console/wrap-up, /console/work-log 등은 하위 경로도 활성화
 * - 예: /console/wrap-up/coolwithyou → /console/wrap-up 메뉴 활성화
 */
function isPathActive(pathname: string, menuUrl: string): boolean {
  // 정확히 일치
  if (pathname === menuUrl) return true

  // 하위 경로 매칭이 필요한 메뉴들 (개인 ID가 붙는 경로)
  const dynamicPaths = [
    "/console/standup",
    "/console/wrap-up",
    "/console/work-log",
    "/console/stats",
  ]

  if (dynamicPaths.includes(menuUrl)) {
    // menuUrl로 시작하고, 그 다음이 / 또는 끝인 경우
    return new RegExp(`^${menuUrl}(/|$)`).test(pathname)
  }

  return false
}

export function NavMain({ groups }: NavMainProps) {
  const pathname = usePathname()

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.flatMap((item) =>
              item.items?.map((subItem) => {
                // 서브아이템에 개별 아이콘이 있으면 사용, 없으면 부모 아이콘 사용
                const IconComponent =
                  ICON_MAP[subItem.icon ?? item.icon]
                const isActive = isPathActive(pathname, subItem.url)

                return (
                  <SidebarMenuItem key={subItem.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={subItem.title}
                    >
                      <Link href={subItem.url}>
                        {IconComponent && <IconComponent />}
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }) ?? []
            )}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
