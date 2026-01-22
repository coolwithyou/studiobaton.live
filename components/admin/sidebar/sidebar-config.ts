import type { UserRole } from "@/app/generated/prisma"

// 아이콘 이름 타입 정의 (Server → Client 직렬화를 위해 문자열 사용)
export type IconName =
  | "Home"
  | "LayoutDashboard"
  | "BarChart3"
  | "PenSquare"
  | "Wand2"
  | "Menu"
  | "MessageSquare"
  | "CheckSquare"
  | "GitCommit"
  | "FolderGit2"
  | "FolderKanban"
  | "UserCog"
  | "Users"
  | "Shield"
  | "ShieldCheck"
  | "ExternalLink"
  | "Globe"
  | "Settings"
  | "HelpCircle"
  | "FileText"
  | "Newspaper"
  | "ClipboardList"

export interface NavItem {
  title: string
  url: string
  icon: IconName
  isActive?: boolean
  external?: boolean
  items?: {
    title: string
    url: string
  }[]
}

export interface NavGroup {
  id: string
  label: string
  roles: UserRole[]
  items: NavItem[]
}

// 메인 네비게이션 (대시보드, 콘텐츠, 팀 활동)
export const NAV_MAIN: NavGroup[] = [
  {
    id: "dashboard",
    label: "대시보드",
    roles: ["ADMIN"],
    items: [
      {
        title: "대시보드",
        url: "#",
        icon: "LayoutDashboard",
        items: [
          { title: "홈", url: "/console" },
          { title: "통계", url: "/console/stats" },
        ],
      },
    ],
  },
  {
    id: "content",
    label: "콘텐츠",
    roles: ["ADMIN"],
    items: [
      {
        title: "콘텐츠",
        url: "#",
        icon: "Newspaper",
        items: [
          { title: "커밋 수집", url: "/console/generate" },
          { title: "포스트 목록", url: "/console/posts" },
          { title: "포스트 작성", url: "/console/posts/new" },
          { title: "콘텐츠 타입", url: "/console/content-types" },
          { title: "사이드 메뉴", url: "/console/sidemenu" },
        ],
      },
    ],
  },
  {
    id: "team",
    label: "팀 활동",
    roles: ["ADMIN", "TEAM_MEMBER"],
    items: [
      {
        title: "팀 활동",
        url: "#",
        icon: "Users",
        items: [
          { title: "스탠드업", url: "/console/standup" },
          { title: "랩업", url: "/console/wrap-up" },
          { title: "업무일지", url: "/console/work-log" },
          // { title: "커밋 리뷰", url: "/console/review" },
        ],
      },
    ],
  },
]

// 세컨더리 네비게이션 (설정 관련 - 하단 고정)
export const NAV_SECONDARY: NavItem[] = [
  {
    title: "프로젝트 설정",
    url: "/console/projects",
    icon: "FolderKanban",
  },
  {
    title: "팀원 관리",
    url: "/console/members",
    icon: "UserCog",
  },
  {
    title: "사용자 관리",
    url: "/console/users",
    icon: "ShieldCheck",
  },
  {
    title: "사이트 보기",
    url: "/",
    icon: "Globe",
    external: true,
  },
]

// 역할에 따라 메인 네비게이션 필터링
export function filterNavMainByRole(role: UserRole): NavGroup[] {
  return NAV_MAIN.filter((group) => group.roles.includes(role))
}

// 역할에 따라 세컨더리 네비게이션 필터링 (ADMIN만)
export function filterNavSecondaryByRole(role: UserRole): NavItem[] {
  if (role === "ADMIN") {
    return NAV_SECONDARY
  }
  // TEAM_MEMBER는 사이트 보기만 가능
  return NAV_SECONDARY.filter((item) => item.external)
}
