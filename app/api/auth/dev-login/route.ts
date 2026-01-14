import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * 개발/테스트 환경 전용 Bearer 토큰 기반 인증 API
 *
 * 용도: AI 에이전트, E2E 테스트, 자동화 스크립트에서 사용
 * 보안: NODE_ENV=production 에서는 자동으로 비활성화됨
 *
 * 사용법:
 * POST /api/auth/dev-login
 * Body: { "email": "admin@ba-ton.kr" }
 * Response: { "success": true, "token": "dev_xxx", "user": {...} }
 *
 * 이후 API 요청 시 Authorization 헤더에 토큰 포함:
 * Authorization: Bearer dev_xxx
 *
 * 참고: 이 토큰은 개발 환경 전용이며, proxy.ts에서 인증됩니다.
 */
export async function POST(request: NextRequest) {
  // 프로덕션 환경에서는 비활성화
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    )
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // @ba-ton.kr 도메인만 허용
    if (!email.endsWith("@ba-ton.kr")) {
      return NextResponse.json(
        { error: "Only @ba-ton.kr emails are allowed" },
        { status: 403 }
      )
    }

    // Admin 계정 조회 또는 생성
    let admin = await prisma.admin.findUnique({
      where: { email },
    })

    if (!admin) {
      admin = await prisma.admin.create({
        data: {
          email,
          name: email.split("@")[0],
          emailVerified: new Date(),
        },
      })
    }

    // 개발용 Bearer 토큰 생성 (이메일 기반)
    const token = `dev_${Buffer.from(admin.email).toString("base64")}`

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
      usage: "Authorization: Bearer " + token,
    })
  } catch (error) {
    console.error("[Dev Login Error]", error)
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    )
  }
}

/**
 * Bearer 토큰으로 사용자 정보 조회
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    )
  }

  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader?.startsWith("Bearer dev_")) {
      return NextResponse.json(
        { error: "No dev token found" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // "Bearer " 제거
    const email = Buffer.from(token.substring(4), "base64").toString() // "dev_" 제거

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    })

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: admin,
    })
  } catch (error) {
    console.error("[Dev Token Check Error]", error)
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    )
  }
}

/**
 * 토큰 무효화 (로그아웃)
 *
 * 참고: Bearer 토큰은 stateless이므로 서버에서 무효화할 수 없습니다.
 * 클라이언트에서 토큰을 삭제하면 됩니다.
 */
export async function DELETE() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Delete the token from your client to logout",
  })
}
