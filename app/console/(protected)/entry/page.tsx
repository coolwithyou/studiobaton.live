import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth-helpers"
import prisma from "@/lib/prisma"

// 시간 기반 리다이렉트이므로 캐싱 방지
export const dynamic = "force-dynamic"

/**
 * 로그인 후 진입점 페이지
 * - ADMIN: 대시보드로 이동
 * - TEAM_MEMBER: 시간에 따라 스탠드업(15시 전) 또는 랩업(15시 후)으로 이동
 */
export default async function EntryPage() {
  const session = await getServerSession()

  if (!session?.user?.id) {
    redirect("/console/login")
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  // ADMIN은 대시보드로
  if (admin?.role === "ADMIN") {
    redirect("/console")
  }

  // TEAM_MEMBER는 시간 기반 리다이렉트
  if (admin?.role === "TEAM_MEMBER") {
    // 한국 시간 기준으로 현재 시간 계산
    const koreaTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Seoul",
    })
    const hour = new Date(koreaTime).getHours()

    if (hour < 15) {
      // 오후 3시 이전 → 스탠드업
      redirect("/console/standup")
    } else {
      // 오후 3시 이후 → 랩업
      redirect("/console/wrap-up")
    }
  }

  // 기타 역할은 리뷰 페이지로 (fallback)
  redirect("/console/review")
}
