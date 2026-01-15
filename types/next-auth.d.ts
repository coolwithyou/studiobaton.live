import { UserRole, UserStatus } from "@/app/generated/prisma"

// Admin과 연결된 Member 정보
export interface LinkedMember {
  id: string
  name: string
  githubName: string
  avatarUrl: string | null
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: UserRole
      status: UserStatus
      linkedMember?: LinkedMember | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role?: UserRole
    status?: UserStatus
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    id: string
    email: string
    emailVerified: Date | null
    name?: string | null
    image?: string | null
    role?: UserRole
    status?: UserStatus
  }
}
