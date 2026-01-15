import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { AdminPrismaAdapter } from "@/lib/auth-adapter"
import prisma from "@/lib/prisma"
import type { UserRole, UserStatus } from "@/app/generated/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: AdminPrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          // @ba-ton.kr 도메인 힌트 (선택적)
          // hd: "ba-ton.kr", // 외부 사용자도 허용하므로 제거
        },
      },
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 7 * 24 * 60 * 60, // 7일
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    async signIn({ user }) {
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

        // 역할 및 상태 정보 추가
        const admin = await prisma.admin.findUnique({
          where: { id: user.id },
          select: { role: true, status: true },
        })

        session.user.role = (admin?.role ?? "ORG_MEMBER") as UserRole
        session.user.status = (admin?.status ?? "PENDING") as UserStatus
      }
      return session
    },
  },
})
