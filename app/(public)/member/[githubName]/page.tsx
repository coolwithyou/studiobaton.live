import { use } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { MemberProfileHeader } from "@/components/member/member-profile-header";
import { MemberCommitList } from "@/components/member/member-commit-list";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ githubName: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { githubName } = await params;

  const member = await prisma.member.findFirst({
    where: { githubName, isActive: true },
    select: { name: true, githubName: true },
  });

  if (!member) {
    return { title: "팀원을 찾을 수 없습니다" };
  }

  return {
    title: `${member.name} (@${member.githubName}) | ${SITE_NAME}`,
    description: `${member.name}의 개발 활동과 최근 커밋을 확인하세요.`,
    alternates: {
      canonical: `${SITE_URL}/member/${githubName}`,
    },
    openGraph: {
      title: `${member.name} (@${member.githubName}) | ${SITE_NAME}`,
      description: `${member.name}의 개발 활동과 최근 커밋을 확인하세요.`,
      url: `${SITE_URL}/member/${githubName}`,
      siteName: SITE_NAME,
      type: "profile",
    },
  };
}

export default function MemberProfilePage({ params }: PageProps) {
  const { githubName } = use(params);

  return <MemberProfile githubName={githubName} />;
}

async function MemberProfile({ githubName }: { githubName: string }) {
  // 팀원 정보 조회
  const member = await prisma.member.findFirst({
    where: { githubName, isActive: true },
    select: {
      id: true,
      name: true,
      githubName: true,
      email: true,
      avatarUrl: true,
    },
  });

  if (!member) {
    notFound();
  }

  // 최근 커밋 조회 (authorEmail로 매칭)
  const recentCommits = await prisma.commitLog.findMany({
    where: { authorEmail: member.email },
    orderBy: { committedAt: "desc" },
    take: 20,
    select: {
      id: true,
      sha: true,
      repository: true,
      message: true,
      committedAt: true,
      additions: true,
      deletions: true,
      url: true,
    },
  });

  // 통계 계산
  const totalCommits = await prisma.commitLog.count({
    where: { authorEmail: member.email },
  });

  const uniqueRepos = await prisma.commitLog.groupBy({
    by: ["repository"],
    where: { authorEmail: member.email },
  });

  const stats = {
    totalCommits,
    repoCount: uniqueRepos.length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/members"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          팀원 목록으로
        </Link>

        <MemberProfileHeader member={member} stats={stats} />

        <Separator className="my-8" />

        <section>
          <h2 className="text-xl font-semibold mb-4">최근 커밋</h2>
          <MemberCommitList commits={recentCommits} />
        </section>
      </div>
    </div>
  );
}
