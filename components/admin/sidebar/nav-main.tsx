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
}

interface NavMainProps {
  groups: NavGroup[]
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
                const IconComponent = ICON_MAP[item.icon]
                const isActive = pathname === subItem.url

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
