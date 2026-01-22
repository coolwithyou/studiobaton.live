import { use } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { MemberTabs } from "../../standup/_components/member-tabs";
import { WrapUpContent } from "../_components/wrap-up-content";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ githubName: string }>;
}

export default function WrapUpMemberPage({ params }: PageProps) {
  const { githubName } = use(params);
  return <WrapUpPageContent githubName={githubName} />;
}

async function WrapUpPageContent({ githubName }: { githubName: string }) {
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
    <PageContainer maxWidth="2xl">
      <PageHeader
        title="랩업"
        description="오늘 하루도 고생 많으셨습니다!"
      />

      <MemberTabs
        members={membersWithLink}
        currentGithubName={githubName}
        basePath="/console/wrap-up"
      />

      <div className="mt-6">
        <WrapUpContent
          memberId={member.id}
          memberGithubName={member.githubName}
        />
      </div>
    </PageContainer>
  );
}
