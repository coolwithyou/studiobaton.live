import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import {
  manualPostCreateSchema,
  manualPostUpdateSchema,
  formatZodError,
} from "@/lib/validation";
import { nowKST } from "@/lib/date-utils";

/**
 * 수동 포스트 생성
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = manualPostCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { title, content, summary, slug, category, status } = validation.data;

    // slug 중복 검사
    const existingPost = await prisma.post.findUnique({
      where: { slug },
    });

    if (existingPost) {
      return NextResponse.json(
        { error: "이미 사용 중인 URL slug입니다." },
        { status: 409 }
      );
    }

    // 현재 사용자 조회
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수동 포스트 생성
    const post = await prisma.post.create({
      data: {
        targetDate: nowKST(), // 현재 날짜 기준
        type: "MANUAL",
        title,
        content,
        summary,
        slug,
        category,
        status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        publishedAt: status === "PUBLISHED" ? nowKST() : null,
        publishedById: status === "PUBLISHED" ? admin.id : null,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Create manual post error:", error);
    return NextResponse.json(
      { error: "포스트 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 수동 포스트 수정
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = manualPostUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validation.data;

    // 기존 포스트 확인
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수동 포스트만 수정 가능
    if (existingPost.type !== "MANUAL") {
      return NextResponse.json(
        { error: "수동 포스트만 수정할 수 있습니다." },
        { status: 400 }
      );
    }

    // slug 중복 검사 (변경하는 경우)
    if (updateData.slug && updateData.slug !== existingPost.slug) {
      const slugExists = await prisma.post.findUnique({
        where: { slug: updateData.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: "이미 사용 중인 URL slug입니다." },
          { status: 409 }
        );
      }
    }

    // 현재 사용자 조회 (발행 시 필요)
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
    });

    // 상태 변경에 따른 처리
    const publishUpdate: Record<string, unknown> = {};
    if (updateData.status === "PUBLISHED" && existingPost.status !== "PUBLISHED") {
      publishUpdate.publishedAt = nowKST();
      publishUpdate.publishedById = admin?.id;
    } else if (updateData.status === "DRAFT" && existingPost.status === "PUBLISHED") {
      publishUpdate.publishedAt = null;
      publishUpdate.publishedById = null;
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...updateData,
        ...publishUpdate,
      },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Update manual post error:", error);
    return NextResponse.json(
      { error: "포스트 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 수동 포스트 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "포스트 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 기존 포스트 확인
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수동 포스트만 삭제 가능
    if (existingPost.type !== "MANUAL") {
      return NextResponse.json(
        { error: "수동 포스트만 삭제할 수 있습니다." },
        { status: 400 }
      );
    }

    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete manual post error:", error);
    return NextResponse.json(
      { error: "포스트 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
