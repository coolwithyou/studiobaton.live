import { use } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { MemberTabs } from "../../standup/_components/member-tabs";
import { WrapUpContent } from "../_components/wrap-up-content";
import { PageContainer } from "@/components/admin/ui/page-container";
import { PageHeader } from "@/components/admin/ui/page-header";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ memberId: string }>;
}

export default function WrapUpMemberPage({ params }: PageProps) {
  const { memberId } = use(params);
  return <WrapUpPageContent memberId={memberId} />;
}

async function WrapUpPageContent({ memberId }: { memberId: string }) {
  // 병렬 데이터 조회
  const [member, members] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId, isActive: true },
      select: { id: true, name: true, avatarUrl: true, githubName: true },
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
    <PageContainer maxWidth="2xl">
      <PageHeader
        title="랩업"
        description="오늘 하루도 고생 많으셨습니다!"
      />

      <MemberTabs
        members={membersWithLink}
        currentMemberId={memberId}
        basePath="/console/wrap-up"
      />

      <div className="mt-6">
        <WrapUpContent
          memberId={memberId}
          memberGithubName={member.githubName}
        />
      </div>
    </PageContainer>
  );
}
