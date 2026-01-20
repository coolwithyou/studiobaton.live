import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

// 최대 파일 크기 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const memberId = formData.get("memberId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    if (!memberId) {
      return NextResponse.json(
        { error: "멤버 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, WebP 형식만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 5MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 멤버 조회 및 권한 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, avatarUrl: true, email: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 본인 또는 Admin만 업로드 가능
    const admin = await prisma.admin.findUnique({
      where: { id: session.user.id },
      select: { role: true, linkedMemberId: true },
    });

    const isOwnProfile = admin?.linkedMemberId === memberId;
    const isAdmin = admin?.role === "ADMIN";

    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { error: "프로필 이미지를 수정할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 기존 이미지가 Vercel Blob이면 삭제
    if (member.avatarUrl?.includes("blob.vercel-storage.com")) {
      try {
        await del(member.avatarUrl);
      } catch {
        // 삭제 실패해도 계속 진행
      }
    }

    // Vercel Blob에 업로드
    const filename = `profile/${memberId}/${Date.now()}.${file.type.split("/")[1]}`;
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    // DB 업데이트
    await prisma.member.update({
      where: { id: memberId },
      data: { avatarUrl: blob.url },
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
    });
  } catch (error) {
    console.error("Profile image upload error:", error);
    return NextResponse.json(
      { error: "이미지 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "멤버 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { avatarUrl: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 확인
    const admin = await prisma.admin.findUnique({
      where: { id: session.user.id },
      select: { role: true, linkedMemberId: true },
    });

    const isOwnProfile = admin?.linkedMemberId === memberId;
    const isAdmin = admin?.role === "ADMIN";

    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { error: "프로필 이미지를 삭제할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // Vercel Blob에서 삭제
    if (member.avatarUrl?.includes("blob.vercel-storage.com")) {
      await del(member.avatarUrl);
    }

    // DB 업데이트
    await prisma.member.update({
      where: { id: memberId },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile image delete error:", error);
    return NextResponse.json(
      { error: "이미지 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
