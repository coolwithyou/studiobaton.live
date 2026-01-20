import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess, isAdmin } from "@/lib/auth-helpers";
import { getCommitsByAuthorWithDetails } from "@/lib/github";
import prisma from "@/lib/prisma";
import { parseISO } from "date-fns";
import { endOfDayKST } from "@/lib/date-utils";

export interface RefreshCommitsResult {
  success: boolean;
  memberId: string;
  memberName: string;
  date: string;
  addedCount: number;
  existingCount: number;
  totalFromGitHub: number;
  error?: string;
}

/**
 * POST /api/member/commits/refresh
 *
 * 멤버의 커밋을 GitHub에서 가져와 DB에 저장
 * - 일반 팀원: 본인 커밋만 가져올 수 있음
 * - 최고 관리자(ADMIN): 모든 멤버의 커밋 가져올 수 있음
 * - 이미 DB에 있는 커밋(SHA)은 스킵
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 팀 접근 권한 확인 (ADMIN 또는 TEAM_MEMBER)
    const hasAccess = await hasTeamAccess();
    if (!hasAccess) {
      return NextResponse.json(
        { error: "팀원 기능 접근 권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, date } = body;

    if (!memberId || !date) {
      return NextResponse.json(
        { error: "memberId와 date 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const targetDate = parseISO(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요." },
        { status: 400 }
      );
    }

    // 미래 날짜는 처리하지 않음 (KST 기준)
    const todayEnd = endOfDayKST();
    if (targetDate > todayEnd) {
      return NextResponse.json(
        { error: "미래 날짜는 처리할 수 없습니다." },
        { status: 400 }
      );
    }

    // 권한 확인: ADMIN이 아니면 본인 커밋만 가져올 수 있음
    const userIsAdmin = await isAdmin();

    if (!userIsAdmin) {
      // TEAM_MEMBER인 경우: linkedMemberId 확인
      const admin = await prisma.admin.findUnique({
        where: { id: session.user.id },
        select: { linkedMemberId: true },
      });

      if (!admin?.linkedMemberId) {
        return NextResponse.json(
          { error: "연결된 멤버 정보가 없습니다. 관리자에게 문의하세요." },
          { status: 403 }
        );
      }

      if (admin.linkedMemberId !== memberId) {
        return NextResponse.json(
          { error: "본인의 커밋만 새로고침할 수 있습니다." },
          { status: 403 }
        );
      }
    }

    // 멤버 정보 조회
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, githubName: true, email: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // GitHub에서 커밋 조회 (상세 정보 포함)
    const githubCommits = await getCommitsByAuthorWithDetails(
      member.githubName,
      targetDate
    );

    if (githubCommits.length === 0) {
      return NextResponse.json({
        success: true,
        memberId: member.id,
        memberName: member.name,
        date,
        addedCount: 0,
        existingCount: 0,
        totalFromGitHub: 0,
      });
    }

    // 기존 커밋 SHA 조회
    const existingShas = await prisma.commitLog.findMany({
      where: {
        sha: { in: githubCommits.map((c) => c.sha) },
      },
      select: { sha: true },
    });
    const existingShaSet = new Set(existingShas.map((c) => c.sha));

    // 새 커밋 필터링
    const newCommits = githubCommits.filter((c) => !existingShaSet.has(c.sha));

    // 새 커밋 저장 (postId 없이 - 프로필 통계용)
    for (const commit of newCommits) {
      await prisma.$transaction(async (tx) => {
        await tx.commitLog.create({
          data: {
            sha: commit.sha,
            repository: commit.repository,
            message: commit.message,
            author: commit.author,
            authorEmail: commit.authorEmail,
            authorAvatar: commit.authorAvatar,
            committedAt: commit.committedAt,
            additions: commit.additions,
            deletions: commit.deletions,
            filesChanged: commit.filesChanged,
            url: commit.url,
            postId: null, // 개인 새로고침 커밋은 Post에 연결하지 않음
          },
        });

        // 파일 정보도 저장
        if (commit.files.length > 0) {
          await tx.commitFile.createMany({
            data: commit.files.map((file) => ({
              commitSha: commit.sha,
              filename: file.filename,
              status: file.status,
              additions: file.additions,
              deletions: file.deletions,
              changes: file.changes,
              patch: file.patch || null,
            })),
          });
        }
      });
    }

    const result: RefreshCommitsResult = {
      success: true,
      memberId: member.id,
      memberName: member.name,
      date,
      addedCount: newCommits.length,
      existingCount: existingShaSet.size,
      totalFromGitHub: githubCommits.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Refresh commits error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "커밋 새로고침 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
