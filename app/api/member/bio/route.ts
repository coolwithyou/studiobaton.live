import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

// bio 최대 길이 (5000자)
const MAX_BIO_LENGTH = 5000;

export async function PATCH(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memberId, bio } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "멤버 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // bio 유효성 검사 (null/undefined는 허용 - 삭제용)
    if (bio !== null && bio !== undefined && typeof bio !== "string") {
      return NextResponse.json(
        { error: "bio는 문자열이어야 합니다." },
        { status: 400 }
      );
    }

    // bio 길이 제한
    if (bio && bio.length > MAX_BIO_LENGTH) {
      return NextResponse.json(
        { error: `bio는 ${MAX_BIO_LENGTH}자 이하여야 합니다.` },
        { status: 400 }
      );
    }

    // 멤버 존재 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 본인 또는 Admin만 수정 가능
    const admin = await prisma.admin.findUnique({
      where: { id: session.user.id },
      select: { role: true, linkedMemberId: true },
    });

    const isOwnProfile = admin?.linkedMemberId === memberId;
    const isAdmin = admin?.role === "ADMIN";

    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { error: "bio를 수정할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // DB 업데이트 (빈 문자열은 null로 저장)
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: { bio: bio?.trim() || null },
      select: { id: true, bio: true },
    });

    return NextResponse.json({
      success: true,
      bio: updatedMember.bio,
    });
  } catch (error) {
    console.error("Bio update error:", error);
    return NextResponse.json(
      { error: "bio 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
