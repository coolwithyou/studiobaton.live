import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import {
  contentTypeCreateSchema,
  contentTypeUpdateSchema,
  formatZodError,
} from "@/lib/validation";

/**
 * 콘텐츠 타입 전체 조회 (관리자용)
 */
export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contentTypes = await prisma.contentType.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: { posts: true, menuItems: true },
        },
      },
    });

    return NextResponse.json({ contentTypes });
  } catch (error) {
    console.error("Get content types error:", error);
    return NextResponse.json(
      { error: "콘텐츠 타입을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 콘텐츠 타입 생성
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
    const validation = contentTypeCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { slug, pluralSlug, displayName, description, displayOrder, isActive } =
      validation.data;

    // 중복 검사
    const existing = await prisma.contentType.findFirst({
      where: {
        OR: [{ slug }, { pluralSlug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 슬러그입니다." },
        { status: 409 }
      );
    }

    const contentType = await prisma.contentType.create({
      data: {
        slug,
        pluralSlug,
        displayName,
        description,
        displayOrder,
        isActive,
      },
    });

    return NextResponse.json({ contentType }, { status: 201 });
  } catch (error) {
    console.error("Create content type error:", error);
    return NextResponse.json(
      { error: "콘텐츠 타입 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 콘텐츠 타입 수정
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
    const validation = contentTypeUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validation.data;

    const existingContentType = await prisma.contentType.findUnique({
      where: { id },
    });

    if (!existingContentType) {
      return NextResponse.json(
        { error: "콘텐츠 타입을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // slug/pluralSlug 변경 시 중복 검사
    if (updateData.slug || updateData.pluralSlug) {
      const duplicate = await prisma.contentType.findFirst({
        where: {
          id: { not: id },
          OR: [
            updateData.slug ? { slug: updateData.slug } : {},
            updateData.pluralSlug ? { pluralSlug: updateData.pluralSlug } : {},
          ].filter((obj) => Object.keys(obj).length > 0),
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "이미 존재하는 슬러그입니다." },
          { status: 409 }
        );
      }
    }

    const contentType = await prisma.contentType.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ contentType });
  } catch (error) {
    console.error("Update content type error:", error);
    return NextResponse.json(
      { error: "콘텐츠 타입 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 콘텐츠 타입 삭제
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
        { error: "콘텐츠 타입 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const existingContentType = await prisma.contentType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { posts: true, menuItems: true },
        },
      },
    });

    if (!existingContentType) {
      return NextResponse.json(
        { error: "콘텐츠 타입을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 연결된 데이터가 있으면 경고
    if (existingContentType._count.posts > 0 || existingContentType._count.menuItems > 0) {
      return NextResponse.json(
        {
          error: `이 콘텐츠 타입에 연결된 포스트(${existingContentType._count.posts}개) 또는 메뉴 아이템(${existingContentType._count.menuItems}개)이 있습니다. 먼저 연결을 해제해주세요.`,
        },
        { status: 409 }
      );
    }

    await prisma.contentType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete content type error:", error);
    return NextResponse.json(
      { error: "콘텐츠 타입 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
