import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

// 최대 파일 크기 (일반: 5MB, GIF: 10MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_GIF_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

    // 관리자 권한 확인
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const postId = formData.get("postId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    if (!postId) {
      return NextResponse.json(
        { error: "포스트 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, WebP, GIF 형식만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (GIF는 10MB, 그 외 5MB)
    const maxSize = file.type === "image/gif" ? MAX_GIF_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: file.type === "image/gif"
          ? "GIF 파일 크기는 10MB 이하여야 합니다."
          : "파일 크기는 5MB 이하여야 합니다."
        },
        { status: 400 }
      );
    }

    // 포스트 조회
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, thumbnailUrl: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 기존 썸네일이 Vercel Blob이면 삭제
    if (post.thumbnailUrl?.includes("blob.vercel-storage.com")) {
      try {
        await del(post.thumbnailUrl);
      } catch {
        // 삭제 실패해도 계속 진행
      }
    }

    // Vercel Blob에 업로드
    const ext = file.type.split("/")[1];
    const filename = `thumbnail/${postId}/${Date.now()}.${ext}`;
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    // DB 업데이트
    await prisma.post.update({
      where: { id: postId },
      data: { thumbnailUrl: blob.url },
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
    });
  } catch (error) {
    console.error("Post thumbnail upload error:", error);
    return NextResponse.json(
      { error: "썸네일 업로드 중 오류가 발생했습니다." },
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

    // 관리자 권한 확인
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "포스트 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { thumbnailUrl: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Vercel Blob에서 삭제
    if (post.thumbnailUrl?.includes("blob.vercel-storage.com")) {
      await del(post.thumbnailUrl);
    }

    // DB 업데이트
    await prisma.post.update({
      where: { id: postId },
      data: { thumbnailUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Post thumbnail delete error:", error);
    return NextResponse.json(
      { error: "썸네일 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
