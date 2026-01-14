import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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

    // @ba-ton.kr 도메인만 허용
    return email.endsWith("@ba-ton.kr")
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 로그인 페이지와 auth API는 항상 허용
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Auth.js 세션 인증 시도
  const session = await auth()

  // 개발 환경 Bearer 토큰 형식 확인 (실제 검증은 API에서)
  const hasDevToken = hasValidDevTokenFormat(request)

  const isAuthenticated = !!session?.user || hasDevToken

  // /admin 하위 페이지는 인증 필요 (Bearer 토큰은 브라우저 페이지 접근 불가)
  if (pathname.startsWith("/admin")) {
    if (!session?.user) {
      const loginUrl = new URL("/admin/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // /api/admin 하위 API는 인증 필요
  if (pathname.startsWith("/api/admin")) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
