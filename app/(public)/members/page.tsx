import { Suspense } from "react";
import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { MemberCard } from "@/components/member/member-card";
import { MembersSkeleton } from "@/components/member/members-skeleton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `팀원 소개 | ${SITE_NAME}`,
  description: "스튜디오 바톤 개발팀원들을 소개합니다.",
  alternates: {
    canonical: `${SITE_URL}/members`,
  },
  openGraph: {
    title: `팀원 소개 | ${SITE_NAME}`,
    description: "스튜디오 바톤 개발팀원들을 소개합니다.",
    url: `${SITE_URL}/members`,
    siteName: SITE_NAME,
    type: "website",
  },
};

async function MemberGrid() {
  const members = await prisma.member.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      githubName: true,
      avatarUrl: true,
      profileImageUrl: true,
    },
  });

  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        아직 등록된 팀원이 없습니다.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {members.map((member) => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}

export default function MembersPage() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">팀원 소개</h1>
        <p className="text-muted-foreground mt-2">
          스튜디오 바톤 개발팀을 소개합니다
        </p>
      </header>

      <Suspense fallback={<MembersSkeleton />}>
        <MemberGrid />
      </Suspense>
    </div>
  );
}
