import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

/**
 * GET /api/me
 *
 * 현재 로그인한 사용자의 정보 반환
 * - 역할(role), 상태(status), linkedMemberId 포함
 */
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin 테이블에서 추가 정보 조회
    const admin = await prisma.admin.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        linkedMemberId: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      image: admin.image,
      role: admin.role,
      status: admin.status,
      linkedMemberId: admin.linkedMemberId,
    });
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json(
      { error: "사용자 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
