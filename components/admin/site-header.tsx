"use client"

import { Fragment } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// 경로를 한글 라벨로 변환하는 맵
const pathLabels: Record<string, string> = {
  admin: "관리자",
  dashboard: "대시보드",
  stats: "통계",
  content: "콘텐츠",
  posts: "포스트",
  new: "새 글 작성",
  generate: "수동 생성",
  sidemenu: "사이드 메뉴",
  team: "팀 활동",
  standup: "스탠드업",
  "wrap-up": "랩업",
  review: "커밋 리뷰",
  settings: "설정",
  projects: "프로젝트",
  members: "팀원 관리",
  users: "사용자 관리",
  profile: "프로필",
}

function getLabel(segment: string): string {
  return pathLabels[segment] || segment
}

export function SiteHeader() {
  const pathname = usePathname()

  // 경로를 세그먼트로 분리
  const segments = pathname.split("/").filter(Boolean)

  // 브레드크럼 아이템 생성
  const breadcrumbItems = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const isLast = index === segments.length - 1
    const label = getLabel(segment)

    return { href, label, isLast }
  })

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <Fragment key={item.href}>
              {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                {item.isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
