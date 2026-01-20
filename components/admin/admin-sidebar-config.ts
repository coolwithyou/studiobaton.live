import type { UserRole } from "@/app/generated/prisma";
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

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}

export interface MenuGroup {
  id: string;
  title: string;
  roles: UserRole[];
  items: MenuItem[];
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    id: "dashboard",
    title: "대시보드",
    roles: ["ADMIN"],
    items: [
      { href: "/admin", label: "홈", icon: Home },
      { href: "/admin/stats", label: "통계", icon: BarChart3 },
    ],
  },
  {
    id: "content",
    title: "콘텐츠",
    roles: ["ADMIN"],
    items: [
      { href: "/admin/posts/new", label: "포스트 작성", icon: PenSquare },
      { href: "/admin/generate", label: "수동 생성", icon: Wand2 },
      { href: "/admin/sidemenu", label: "사이드 메뉴", icon: Menu },
    ],
  },
  {
    id: "team",
    title: "팀 활동",
    roles: ["ADMIN", "TEAM_MEMBER"],
    items: [
      { href: "/admin/standup", label: "스탠드업", icon: MessageSquare },
      { href: "/admin/wrap-up", label: "랩업", icon: CheckSquare },
      { href: "/admin/review", label: "커밋 리뷰", icon: GitCommit },
    ],
  },
  {
    id: "settings",
    title: "설정",
    roles: ["ADMIN"],
    items: [
      { href: "/admin/projects", label: "프로젝트 설정", icon: FolderGit2 },
      { href: "/admin/members", label: "팀원 관리", icon: UserCog },
      { href: "/admin/users", label: "사용자 관리", icon: Shield },
    ],
  },
];

// 사이트 보기 링크 (항상 표시)
export const EXTERNAL_LINK: MenuItem = {
  href: "/",
  label: "사이트 보기",
  icon: ExternalLink,
  external: true,
};

// 역할에 따라 메뉴 그룹 필터링
export function filterMenuGroupsByRole(role: UserRole): MenuGroup[] {
  return MENU_GROUPS.filter((group) => group.roles.includes(role));
}
