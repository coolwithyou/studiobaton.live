import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";

// POST: 사용자 승인 (PENDING → ACTIVE)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ADMIN만 승인 가능
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

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

    if (targetUser.status !== "PENDING") {
      return NextResponse.json(
        { error: "승인 대기 상태의 사용자만 승인할 수 있습니다." },
        { status: 400 }
      );
    }

    const user = await prisma.admin.update({
      where: { id },
      data: {
        status: "ACTIVE",
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
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
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to approve user:", error);
    return NextResponse.json(
      { error: "Failed to approve user" },
      { status: 500 }
    );
  }
}
