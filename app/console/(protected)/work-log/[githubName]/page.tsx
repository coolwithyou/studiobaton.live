import { use } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";
import { MemberTabs } from "../../standup/_components/member-tabs";
import { WorkLogContent } from "../_components/work-log-content";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ githubName: string }>;
}

export default function WorkLogMemberPage({ params }: PageProps) {
  const { githubName } = use(params);
  return <WorkLogPageContent githubName={githubName} />;
}

async function WorkLogPageContent({ githubName }: { githubName: string }) {
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
        title="업무일지"
        description="일별 할 일과 커밋 기록을 확인하고, AI 주간 요약을 볼 수 있습니다."
      />

      <MemberTabs
        members={membersWithLink}
        currentGithubName={githubName}
        basePath="/console/work-log"
      />

      <div className="mt-6">
        <WorkLogContent
          memberId={member.id}
          memberName={member.name}
          memberGithubName={member.githubName}
        />
      </div>
    </PageContainer>
  );
}
