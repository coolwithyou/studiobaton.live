import { UserRole, UserStatus } from "@/app/generated/prisma"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: UserRole
      status: UserStatus
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
