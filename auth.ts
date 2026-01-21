import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { AdminPrismaAdapter } from "@/lib/auth-adapter"
import prisma from "@/lib/prisma"
import type { UserRole, UserStatus } from "@/app/generated/prisma"

/**
 * 허용된 이메일인지 확인
 * - @ba-ton.kr 도메인은 항상 허용
 * - ALLOWED_EXTERNAL_EMAILS 환경변수에 포함된 이메일도 허용
 */
function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false

  // ba-ton.kr 도메인은 항상 허용
  if (email.endsWith("@ba-ton.kr")) return true

  // 환경변수의 예외 이메일 체크
  const allowedExternalEmails = process.env.ALLOWED_EXTERNAL_EMAILS
  if (!allowedExternalEmails) return false

  const emailList = allowedExternalEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())

  return emailList.includes(email.toLowerCase())
}

/**
 * 외부 이메일인지 확인 (ba-ton.kr 도메인이 아닌 경우)
 */
export function isExternalEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return !email.endsWith("@ba-ton.kr")
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: AdminPrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          // hd 파라미터 제거 - 외부 이메일 예외 허용을 위해 백엔드에서만 검증
        },
      },
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 7 * 24 * 60 * 60, // 7일
  },
  pages: {
    signIn: "/console/login",
    error: "/console/login",
  },
  callbacks: {
    async signIn({ user }) {
      // 허용된 이메일인지 확인 (도메인 또는 예외 목록)
      if (!isAllowedEmail(user.email)) {
        console.log(`로그인 거부 (허용되지 않은 이메일): ${user.email}`)
        return false
      }

      // 외부 이메일 로그인 시 추가 로깅
      if (isExternalEmail(user.email)) {
        console.log(`외부 이메일 로그인: ${user.email}`)
      }

      // 비활성화(INACTIVE) 상태인 기존 사용자는 로그인 거부
      if (user.id) {
        const existingAdmin = await prisma.admin.findUnique({
          where: { id: user.id },
          select: { status: true },
        })
        if (existingAdmin?.status === "INACTIVE") {
          console.log(`로그인 거부 (비활성화): ${user.email}`)
          return false
        }
      }

      console.log(`로그인 성공: ${user.email}`)
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id

        // 역할, 상태, linkedMember 정보 조회
        const admin = await prisma.admin.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            status: true,
            linkedMember: {
              select: {
                id: true,
                name: true,
                githubName: true,
                avatarUrl: true,
              },
            },
          },
        })

        session.user.role = (admin?.role ?? "ORG_MEMBER") as UserRole
        session.user.status = (admin?.status ?? "PENDING") as UserStatus
        session.user.linkedMember = admin?.linkedMember ?? null
      }
      return session
    },
  },
})
