import { auth } from "@/auth"
import { cache } from "react"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"

/**
 * Server Component에서 세션 가져오기 (캐싱됨)
 * 동일 요청 내에서는 한 번만 데이터베이스를 조회합니다.
 */
export const getServerSession = cache(async () => {
  // 먼저 Auth.js 세션 확인
  const session = await auth()
  if (session?.user) {
    return session
  }

  // 개발 환경에서 Bearer 토큰 확인
  if (process.env.NODE_ENV !== "production") {
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (authHeader?.startsWith("Bearer dev_")) {
      try {
        const token = authHeader.substring(7) // "Bearer " 제거
        const email = Buffer.from(token.substring(4), "base64").toString() // "dev_" 제거

        if (email.endsWith("@ba-ton.kr")) {
          const admin = await prisma.admin.findUnique({
            where: { email },
          })

          if (admin) {
            // Auth.js 세션 형식으로 반환
            return {
              user: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                image: admin.image,
              },
              expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }
          }
        }
      } catch {
        // 토큰 파싱 실패 시 무시
      }
    }
  }

  return null
})

/**
 * 내부 사용자인지 확인 (@ba-ton.kr 도메인)
 * 공개 API에서 마스킹 여부 결정 시 사용
 */
export async function isInternalUser() {
  const session = await getServerSession()
  return !!session?.user?.email?.endsWith("@ba-ton.kr")
}

/**
 * 현재 로그인한 관리자의 ID 가져오기
 */
export async function getAdminId() {
  const session = await getServerSession()
  return session?.user?.id
}

/**
 * 현재 로그인한 관리자의 정보 가져오기
 */
export async function getAdminInfo() {
  const session = await getServerSession()
  if (!session?.user) return null

  return {
    id: session.user.id!,
    email: session.user.email!,
    name: session.user.name,
    image: session.user.image,
  }
}
