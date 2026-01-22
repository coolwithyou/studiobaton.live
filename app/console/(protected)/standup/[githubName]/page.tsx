import { use } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { MemberTabs } from "../_components/member-tabs";
import { StandupContent } from "../_components/standup-content";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ githubName: string }>;
}

export default function StandupMemberPage({ params }: PageProps) {
  const { githubName } = use(params);
  return <StandupPageContent githubName={githubName} />;
}

async function StandupPageContent({ githubName }: { githubName: string }) {
  // 병렬 데이터 조회
  const [member, members] = await Promise.all([
    prisma.member.findUnique({
      where: { githubName, isActive: true },
      select: { id: true, name: true, avatarUrl: true, githubName: true },
    }),
    prisma.member.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        githubName: true,
        linkedAdmin: { select: { id: true } },
      },
    }),
  ]);

  if (!member) {
    notFound();
  }

  // MemberTabs용 데이터
  const membersWithLink = members.map((m) => ({
    id: m.id,
    name: m.name,
    avatarUrl: m.avatarUrl,
    githubName: m.githubName,
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
        currentGithubName={githubName}
        basePath="/console/standup"
      />

      <div className="mt-6">
        <StandupContent memberId={member.id} />
      </div>
    </PageContainer>
  );
}
