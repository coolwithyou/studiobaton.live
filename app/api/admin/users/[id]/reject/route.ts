import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";

// POST: 사용자 거절/비활성화 (PENDING/ACTIVE → INACTIVE)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ADMIN만 거절/비활성화 가능
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // 자기 자신 비활성화 방지
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "자신의 계정은 비활성화할 수 없습니다." },
        { status: 400 }
      );
    }

    // 대상 사용자 조회
    const targetUser = await prisma.admin.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 사용자 비활성화 및 세션 삭제
    const [user] = await prisma.$transaction([
      prisma.admin.update({
        where: { id },
        data: { status: "INACTIVE" },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          status: true,
          createdAt: true,
          approvedBy: true,
          approvedAt: true,
        },
      }),
      // 비활성화 시 해당 사용자의 모든 세션 삭제 (강제 로그아웃)
      prisma.session.deleteMany({ where: { adminId: id } }),
    ]);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to reject user:", error);
    return NextResponse.json(
      { error: "Failed to reject user" },
      { status: 500 }
    );
  }
}
