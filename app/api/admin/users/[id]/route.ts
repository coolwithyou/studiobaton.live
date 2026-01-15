import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";

// DELETE: 사용자 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ADMIN만 사용자 삭제 가능
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // 자기 자신 삭제 방지
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "자신의 계정은 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    // 사용자 및 관련 세션 삭제
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { adminId: id } }),
      prisma.account.deleteMany({ where: { adminId: id } }),
      prisma.admin.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
