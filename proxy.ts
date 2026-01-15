import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { UserRole, UserStatus } from "@/app/generated/prisma"

// 역할별 접근 가능한 어드민 경로
const ROLE_ROUTES: Record<UserRole, string[]> = {
  ADMIN: ["/admin"], // 모든 어드민 경로
  TEAM_MEMBER: ["/admin/review", "/admin/standup", "/admin/wrap-up"], // 스탠드업/랩업
  ORG_MEMBER: [], // 어드민 접근 불가
}

/**
 * 역할이 특정 경로에 접근할 수 있는지 확인
 */
function canAccessPath(role: UserRole, pathname: string): boolean {
  // ADMIN은 모든 경로 접근 가능
  if (role === "ADMIN") return true

  const allowedPaths = ROLE_ROUTES[role] || []
  return allowedPaths.some((path) => pathname.startsWith(path))
}

/**
 * Bearer 토큰 형식 검증 (간단한 형식 체크만)
 * 실제 검증은 API routes에서 수행
 */
function hasValidDevTokenFormat(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") {
    return false
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer dev_")) {
    return false
  }

  try {
    const token = authHeader.substring(7) // "Bearer " 제거
    const email = Buffer.from(token.substring(4), "base64").toString() // "dev_" 제거

    // 형식만 검증 (도메인 제한 제거 - 역할로 관리)
    return email.includes("@")
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 로그인, 승인대기 페이지와 auth API는 항상 허용
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/pending") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next()
  }

  // Auth.js 세션 인증 시도
  const session = await auth()

  // 개발 환경 Bearer 토큰 형식 확인 (실제 검증은 API에서)
  const hasDevToken = hasValidDevTokenFormat(request)

  const isAuthenticated = !!session?.user || hasDevToken

  // /admin 하위 페이지는 인증 및 역할 확인 필요
  if (pathname.startsWith("/admin")) {
    // 미인증 → 로그인 페이지
    if (!session?.user) {
      const loginUrl = new URL("/admin/login", request.url)
      return NextResponse.redirect(loginUrl)
    }

    const role = session.user.role as UserRole
    const status = session.user.status as UserStatus

    // PENDING 상태 → 승인 대기 페이지
    if (status === "PENDING") {
      const pendingUrl = new URL("/admin/pending", request.url)
      return NextResponse.redirect(pendingUrl)
    }

    // INACTIVE 상태 → 로그아웃 처리 (로그인 페이지로)
    if (status === "INACTIVE") {
      const loginUrl = new URL("/admin/login?error=inactive", request.url)
      return NextResponse.redirect(loginUrl)
    }

    // 역할 기반 접근 제어
    if (!canAccessPath(role, pathname)) {
      // 접근 권한 없음 → 권한 내 기본 페이지로 리다이렉트
      if (role === "TEAM_MEMBER") {
        return NextResponse.redirect(new URL("/admin/review", request.url))
      }
      // ORG_MEMBER는 어드민 접근 불가 → 홈으로
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // /api/admin 하위 API는 인증 필요
  if (pathname.startsWith("/api/admin")) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // API에서는 세션이 있으면 역할도 확인
    if (session?.user) {
      const status = session.user.status as UserStatus

      // PENDING/INACTIVE 상태는 API 접근 불가
      if (status !== "ACTIVE") {
        return NextResponse.json({ error: "Account not active" }, { status: 403 })
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
