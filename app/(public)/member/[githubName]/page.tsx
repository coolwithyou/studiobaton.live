import { use, Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { SITE_URL, SITE_NAME } from "@/lib/config";
import { getServerSession } from "@/lib/auth-helpers";
import { MemberProfileHeader } from "@/components/member/member-profile-header";
import { MemberCommitList } from "@/components/member/member-commit-list";
import { MemberActivitySection } from "@/components/member/member-activity-section";
import { EditableBio } from "@/components/member/editable-bio";
import { EditableTitleRole } from "@/components/member/editable-title-role";
import { ContentGrid } from "@/components/layout/content-grid";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
      profileImageUrl: true,
      bio: true,
      title: true,
      role: true,
    },
  });

  if (!member) {
    notFound();
  }

  // 세션 확인 (편집 권한 체크)
  const session = await getServerSession();
  let canEdit = false;

  if (session?.user) {
    const admin = await prisma.admin.findUnique({
      where: { id: session.user.id },
      select: { role: true, linkedMemberId: true },
    });

    // 본인 프로필이거나 Admin인 경우 편집 가능
    canEdit = admin?.linkedMemberId === member.id || admin?.role === "ADMIN";
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
    <ContentGrid maxWidth="3xl">
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        팀원 목록으로
      </Link>

      <MemberProfileHeader member={member} stats={stats} canEdit={canEdit} />

      {/* 직함/역할 섹션 */}
      {(member.title || member.role || canEdit) && (
        <section className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            직함 / 역할
          </h3>
          <EditableTitleRole
            memberId={member.id}
            currentTitle={member.title}
            currentRole={member.role}
            canEdit={canEdit}
          />
        </section>
      )}

      {/* 자기소개 섹션 */}
      {(member.bio || canEdit) && (
        <section className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            소개
          </h3>
          <EditableBio
            memberId={member.id}
            currentBio={member.bio}
            canEdit={canEdit}
          />
        </section>
      )}

      <Separator className="my-8" />

      {/* 개발 활동 지표 섹션 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">📊 개발 활동</h2>
        <Suspense fallback={<ActivitySectionSkeleton />}>
          <MemberActivitySection githubName={member.githubName} />
        </Suspense>
      </section>

      <Separator className="my-8" />

      <section>
        <h2 className="text-xl font-semibold mb-4">최근 커밋</h2>
        <MemberCommitList commits={recentCommits} />
      </section>
    </ContentGrid>
  );
}

function ActivitySectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
