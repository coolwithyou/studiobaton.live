import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { AdminPrismaAdapter } from "@/lib/auth-adapter"
import prisma from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: AdminPrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          // @ba-ton.kr 도메인 힌트
          hd: "ba-ton.kr",
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
      // @ba-ton.kr 도메인만 허용
      if (!user.email?.endsWith("@ba-ton.kr")) {
        console.log(`로그인 거부: ${user.email}`)
        return false
      }

      console.log(`로그인 성공: ${user.email}`)
      return true
    },
    async session({ session, user }) {
      // 세션에 adminId 추가
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
