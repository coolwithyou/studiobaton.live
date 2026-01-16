import type { PrismaClient, UserRole, UserStatus } from "@/app/generated/prisma"
import type { Adapter, AdapterAccount, AdapterSession, AdapterUser, VerificationToken } from "next-auth/adapters"

// 신규 사용자 기본 역할 및 상태
function getDefaultRoleAndStatus(email: string): { role: UserRole; status: UserStatus } {
  // 외부 이메일(ba-ton.kr이 아닌)은 TEAM_MEMBER 역할
  if (!email.endsWith("@ba-ton.kr")) {
    return { role: "TEAM_MEMBER", status: "ACTIVE" }
  }

  // ba-ton.kr 도메인은 ADMIN으로 자동 승인
  return { role: "ADMIN", status: "ACTIVE" }
}

/**
 * Admin 모델을 사용하는 커스텀 Prisma 어댑터
 * 기본 PrismaAdapter는 User 모델을 기대하지만,
 * 이 프로젝트에서는 Admin 모델을 사용하므로 커스터마이징이 필요합니다.
 */
export function AdminPrismaAdapter(prisma: PrismaClient): Adapter {
  return {
    createUser: async (data) => {
      const { role, status } = getDefaultRoleAndStatus(data.email)

      // 이메일로 Member 자동 매칭 시도 (아직 다른 Admin과 연결되지 않은 경우만)
      const matchedMember = await prisma.member.findFirst({
        where: {
          email: data.email,
          linkedAdmin: null,
        },
      })

      const admin = await prisma.admin.create({
        data: {
          email: data.email,
          emailVerified: data.emailVerified,
          name: data.name,
          image: data.image,
          role,
          status,
          approvedAt: status === "ACTIVE" ? new Date() : null,
          linkedMemberId: matchedMember?.id ?? null,
        },
      })
      return {
        id: admin.id,
        email: admin.email,
        emailVerified: admin.emailVerified,
        name: admin.name,
        image: admin.image,
        role: admin.role,
        status: admin.status,
      } as AdapterUser
    },

    getUser: async (id) => {
      const admin = await prisma.admin.findUnique({ where: { id } })
      if (!admin) return null
      return {
        id: admin.id,
        email: admin.email,
        emailVerified: admin.emailVerified,
        name: admin.name,
        image: admin.image,
        role: admin.role,
        status: admin.status,
      } as AdapterUser
    },

    getUserByEmail: async (email) => {
      const admin = await prisma.admin.findUnique({ where: { email } })
      if (!admin) return null
      return {
        id: admin.id,
        email: admin.email,
        emailVerified: admin.emailVerified,
        name: admin.name,
        image: admin.image,
        role: admin.role,
        status: admin.status,
      } as AdapterUser
    },

    getUserByAccount: async ({ providerAccountId, provider }) => {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        include: { admin: true },
      })
      if (!account?.admin) return null
      return {
        id: account.admin.id,
        email: account.admin.email,
        emailVerified: account.admin.emailVerified,
        name: account.admin.name,
        image: account.admin.image,
        role: account.admin.role,
        status: account.admin.status,
      } as AdapterUser
    },

    updateUser: async ({ id, ...data }) => {
      const admin = await prisma.admin.update({
        where: { id },
        data: {
          email: data.email ?? undefined,
          emailVerified: data.emailVerified ?? undefined,
          name: data.name ?? undefined,
          image: data.image ?? undefined,
        },
      })
      return {
        id: admin.id,
        email: admin.email,
        emailVerified: admin.emailVerified,
        name: admin.name,
        image: admin.image,
      } as AdapterUser
    },

    deleteUser: async (id) => {
      await prisma.admin.delete({ where: { id } })
    },

    linkAccount: async (account) => {
      await prisma.account.create({
        data: {
          adminId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state as string | undefined,
        },
      })
      return account as AdapterAccount
    },

    unlinkAccount: async ({ providerAccountId, provider }) => {
      await prisma.account.delete({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
      })
    },

    createSession: async (data) => {
      const session = await prisma.session.create({
        data: {
          sessionToken: data.sessionToken,
          adminId: data.userId,
          expires: data.expires,
        },
      })
      return {
        sessionToken: session.sessionToken,
        userId: session.adminId,
        expires: session.expires,
      } as AdapterSession
    },

    getSessionAndUser: async (sessionToken) => {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { admin: true },
      })
      if (!session?.admin) return null
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.adminId,
          expires: session.expires,
        } as AdapterSession,
        user: {
          id: session.admin.id,
          email: session.admin.email,
          emailVerified: session.admin.emailVerified,
          name: session.admin.name,
          image: session.admin.image,
          role: session.admin.role,
          status: session.admin.status,
        } as AdapterUser,
      }
    },

    updateSession: async (data) => {
      const session = await prisma.session.update({
        where: { sessionToken: data.sessionToken },
        data: {
          expires: data.expires,
        },
      })
      return {
        sessionToken: session.sessionToken,
        userId: session.adminId,
        expires: session.expires,
      } as AdapterSession
    },

    deleteSession: async (sessionToken) => {
      await prisma.session.delete({ where: { sessionToken } })
    },

    createVerificationToken: async (data) => {
      const token = await prisma.verificationToken.create({
        data: {
          identifier: data.identifier,
          token: data.token,
          expires: data.expires,
        },
      })
      return token as VerificationToken
    },

    useVerificationToken: async ({ identifier, token }) => {
      try {
        const verificationToken = await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier,
              token,
            },
          },
        })
        return verificationToken as VerificationToken
      } catch {
        return null
      }
    },
  }
}
