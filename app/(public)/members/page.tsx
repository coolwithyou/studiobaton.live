import { Suspense } from "react";
import { Metadata } from "next";
import prisma from "@/lib/prisma";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { MemberCard } from "@/components/member/member-card";
import { MembersSkeleton } from "@/components/member/members-skeleton";
import { ContentGrid } from "@/components/layout/content-grid";

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
  twitter: {
    card: "summary_large_image",
    title: `팀원 소개 | ${SITE_NAME}`,
    description: "스튜디오 바톤 개발팀원들을 소개합니다.",
  },
};

// 멤버 표시 순서 고정
const MEMBER_ORDER = ["한송욱", "이상희", "추지혜"];

async function MemberGrid() {
  const members = await prisma.member.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      githubName: true,
      avatarUrl: true,
      profileImageUrl: true,
      title: true,
      role: true,
    },
  });

  // 지정된 순서대로 정렬
  const sortedMembers = members.sort((a, b) => {
    const orderA = MEMBER_ORDER.indexOf(a.name);
    const orderB = MEMBER_ORDER.indexOf(b.name);
    // 목록에 없는 멤버는 맨 뒤로
    if (orderA === -1) return 1;
    if (orderB === -1) return -1;
    return orderA - orderB;
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
      {sortedMembers.map((member) => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}

export default function MembersPage() {
  return (
    <ContentGrid>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">팀원 소개</h1>
        <p className="text-muted-foreground mt-2">
          스튜디오 바톤 개발팀을 소개합니다
        </p>
      </header>

      <Suspense fallback={<MembersSkeleton />}>
        <MemberGrid />
      </Suspense>
    </ContentGrid>
  );
}
