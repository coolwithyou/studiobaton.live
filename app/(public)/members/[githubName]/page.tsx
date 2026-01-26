import { use, Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { getServerSession } from "@/lib/auth-helpers";
import { MemberProfileSidebar } from "@/components/member/member-profile-sidebar";
import { MemberCommitList } from "@/components/member/member-commit-list";
import { MemberActivitySection } from "@/components/member/member-activity-section";
import { Skeleton } from "@/components/ui/skeleton";

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
      canonical: `${SITE_URL}/members/${githubName}`,
    },
    openGraph: {
      title: `${member.name} (@${member.githubName}) | ${SITE_NAME}`,
      description: `${member.name}의 개발 활동과 최근 커밋을 확인하세요.`,
      url: `${SITE_URL}/members/${githubName}`,
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
  // 팀원 정보 조회 (externalRepos 포함)
  const member = await prisma.member.findFirst({
    where: { githubName, isActive: true },
    select: {
      id: true,
      name: true,
      githubName: true,
      email: true,
      avatarUrl: true,
      profileImageUrl: true,
      bio: true,
      title: true,
      role: true,
      externalRepos: true,
    },
  });

  if (!member) {
    notFound();
  }

  // 세션 확인 (편집 권한 체크)
  const session = await getServerSession();
  let canEdit = false;
  let isAdmin = false;

  if (session?.user) {
    const admin = await prisma.admin.findUnique({
      where: { id: session.user.id },
      select: { role: true, linkedMemberId: true },
    });

    isAdmin = admin?.role === "ADMIN";
    // 본인 프로필이거나 Admin인 경우 편집 가능
    canEdit = admin?.linkedMemberId === member.id || isAdmin;
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
    <div className="container max-w-6xl mx-auto px-4 py-6">
      {/* 뒤로가기 버튼 */}
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        팀원 목록으로
      </Link>

      {/* 2열 레이아웃 (데스크톱) / 1열 레이아웃 (모바일) */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 좌측 사이드바 */}
        <MemberProfileSidebar
          member={member}
          stats={stats}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />

        {/* 우측 메인 컨텐츠 */}
        <main className="flex-1 min-w-0 space-y-8">
          {/* 개발 활동 지표 섹션 */}
          <section>
            <h2 className="text-lg font-semibold mb-4">개발 활동</h2>
            <Suspense fallback={<ActivitySectionSkeleton />}>
              <MemberActivitySection githubName={member.githubName} />
            </Suspense>
          </section>

          {/* 최근 커밋 목록 */}
          <section>
            <h2 className="text-lg font-semibold mb-4">최근 커밋</h2>
            <MemberCommitList commits={recentCommits} />
          </section>
        </main>
      </div>
    </div>
  );
}

function ActivitySectionSkeleton() {
  return (
    <div className="space-y-4">
      {/* 히트맵 스켈레톤 */}
      <Skeleton className="h-32 w-full" />
      {/* 통계 스켈레톤 */}
      <div className="flex gap-4 flex-wrap">
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      {/* 차트 스켈레톤 */}
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
