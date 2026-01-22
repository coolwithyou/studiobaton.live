import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

export default async function WrapUpRedirectPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/console/login");
  }

  // Admin 정보 조회 (linkedMember의 githubName 포함)
  const admin = await prisma.admin.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      linkedMember: { select: { githubName: true } },
    },
  });

  // TEAM_MEMBER → 본인 페이지로 리다이렉트
  if (admin?.role === "TEAM_MEMBER" && admin.linkedMember?.githubName) {
    redirect(`/console/wrap-up/${admin.linkedMember.githubName}`);
  }

  // ADMIN 또는 linkedMember 없는 경우 → 첫 번째 팀원 페이지로 리다이렉트
  const firstMember = await prisma.member.findFirst({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: { githubName: true },
  });

  if (firstMember) {
    redirect(`/console/wrap-up/${firstMember.githubName}`);
  }

  // 팀원이 없는 경우 → 팀원 관리 페이지로
  redirect("/console/members");
}
