import type { UserRole } from "@/app/generated/prisma"

// 아이콘 이름 타입 정의 (Server → Client 직렬화를 위해 문자열 사용)
export type IconName =
  | "Home"
  | "BarChart3"
  | "PenSquare"
  | "Wand2"
  | "Menu"
  | "MessageSquare"
  | "CheckSquare"
  | "GitCommit"
  | "FolderGit2"
  | "UserCog"
  | "Shield"
  | "ExternalLink"
  | "Settings"
  | "HelpCircle"
  | "FileText"

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
        icon: "Home",
        items: [
          { title: "홈", url: "/admin" },
          { title: "통계", url: "/admin/stats" },
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
        icon: "FileText",
        items: [
          { title: "커밋 수집", url: "/admin/generate" },
          { title: "포스트 작성", url: "/admin/posts/new" },
          { title: "사이드 메뉴", url: "/admin/sidemenu" },
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
        icon: "MessageSquare",
        items: [
          { title: "스탠드업", url: "/admin/standup" },
          { title: "랩업", url: "/admin/wrap-up" },
          { title: "커밋 리뷰", url: "/admin/review" },
        ],
      },
    ],
  },
]

// 세컨더리 네비게이션 (설정 관련 - 하단 고정)
export const NAV_SECONDARY: NavItem[] = [
  {
    title: "프로젝트 설정",
    url: "/admin/projects",
    icon: "FolderGit2",
  },
  {
    title: "팀원 관리",
    url: "/admin/members",
    icon: "UserCog",
  },
  {
    title: "사용자 관리",
    url: "/admin/users",
    icon: "Shield",
  },
  {
    title: "사이트 보기",
    url: "/",
    icon: "ExternalLink",
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
