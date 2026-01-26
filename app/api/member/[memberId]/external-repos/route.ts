import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

// owner/repo 형식 검증 정규식
const EXTERNAL_REPO_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

interface RouteContext {
  params: Promise<{ memberId: string }>;
}

/**
 * 권한 확인: 본인 또는 ADMIN
 */
async function checkPermission(memberId: string) {
  const session = await getServerSession();

  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  const hasAccess = await hasTeamAccess();
  if (!hasAccess) {
    return { error: "팀원 기능 접근 권한이 없습니다.", status: 403 };
  }

  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    // TEAM_MEMBER인 경우: linkedMemberId 확인
    const admin = await prisma.admin.findUnique({
      where: { id: session.user.id },
      select: { linkedMemberId: true },
    });

    if (admin?.linkedMemberId !== memberId) {
      return { error: "본인의 외부 레포지토리만 관리할 수 있습니다.", status: 403 };
    }
  }

  return { ok: true };
}

/**
 * GET /api/member/[memberId]/external-repos
 * 외부 레포 목록 조회
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { memberId } = await context.params;

    const permission = await checkPermission(memberId);
    if ("error" in permission) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { externalRepos: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ externalRepos: member.externalRepos });
  } catch (error) {
    console.error("Get external repos error:", error);
    return NextResponse.json(
      { error: "외부 레포지토리 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/member/[memberId]/external-repos
 * 외부 레포 추가
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { memberId } = await context.params;

    const permission = await checkPermission(memberId);
    if ("error" in permission) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    const body = await request.json();
    const { repo } = body;

    if (!repo || typeof repo !== "string") {
      return NextResponse.json(
        { error: "repo 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // 형식 검증
    if (!EXTERNAL_REPO_REGEX.test(repo)) {
      return NextResponse.json(
        { error: "올바른 형식이 아닙니다. owner/repo 형식으로 입력하세요." },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { externalRepos: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 중복 체크
    if (member.externalRepos.includes(repo)) {
      return NextResponse.json(
        { error: "이미 등록된 레포지토리입니다." },
        { status: 400 }
      );
    }

    // 추가
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: {
        externalRepos: [...member.externalRepos, repo],
      },
      select: { externalRepos: true },
    });

    return NextResponse.json({
      success: true,
      externalRepos: updatedMember.externalRepos,
    });
  } catch (error) {
    console.error("Add external repo error:", error);
    return NextResponse.json(
      { error: "외부 레포지토리 추가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/member/[memberId]/external-repos
 * 외부 레포 삭제
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { memberId } = await context.params;

    const permission = await checkPermission(memberId);
    if ("error" in permission) {
      return NextResponse.json(
        { error: permission.error },
        { status: permission.status }
      );
    }

    const body = await request.json();
    const { repo } = body;

    if (!repo || typeof repo !== "string") {
      return NextResponse.json(
        { error: "repo 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { externalRepos: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 존재 체크
    if (!member.externalRepos.includes(repo)) {
      return NextResponse.json(
        { error: "등록되지 않은 레포지토리입니다." },
        { status: 400 }
      );
    }

    // 삭제
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: {
        externalRepos: member.externalRepos.filter((r) => r !== repo),
      },
      select: { externalRepos: true },
    });

    return NextResponse.json({
      success: true,
      externalRepos: updatedMember.externalRepos,
    });
  } catch (error) {
    console.error("Delete external repo error:", error);
    return NextResponse.json(
      { error: "외부 레포지토리 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
