import { use } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { MemberTabs } from "../_components/member-tabs";
import { StandupContent } from "../_components/standup-content";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ memberId: string }>;
}

export default function StandupMemberPage({ params }: PageProps) {
  const { memberId } = use(params);
  return <StandupPageContent memberId={memberId} />;
}

async function StandupPageContent({ memberId }: { memberId: string }) {
  // 병렬 데이터 조회
  const [member, members] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId, isActive: true },
      select: { id: true, name: true, avatarUrl: true },
    }),
    prisma.member.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        linkedAdmin: { select: { id: true } },
      },
    }),
  ]);

  if (!member) {
    notFound();
  }

  // isLinked 필드 추가
  const membersWithLink = members.map((m) => ({
    id: m.id,
    name: m.name,
    avatarUrl: m.avatarUrl,
    isLinked: !!m.linkedAdmin,
  }));

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="스탠드업"
        description="오늘의 업무 진행 계획을 공유하고 할일을 등록하세요."
      />

      <MemberTabs
        members={membersWithLink}
        currentMemberId={memberId}
        basePath="/console/standup"
      />

      <div className="mt-6">
        <StandupContent memberId={memberId} />
      </div>
    </PageContainer>
  );
}
