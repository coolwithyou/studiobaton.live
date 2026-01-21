import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import {
  sideMenuSectionCreateSchema,
  sideMenuSectionUpdateSchema,
  formatZodError,
} from "@/lib/validation";

/**
 * 사이드 메뉴 섹션 전체 조회 (관리자용)
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

    const sections = await prisma.sideMenuSection.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Get sections error:", error);
    return NextResponse.json(
      { error: "섹션을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 사이드 메뉴 섹션 생성
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
    const validation = sideMenuSectionCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { title, displayOrder, isActive } = validation.data;

    const section = await prisma.sideMenuSection.create({
      data: {
        title,
        displayOrder,
        isActive,
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("Create section error:", error);
    return NextResponse.json(
      { error: "섹션 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 사이드 메뉴 섹션 수정
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
    const validation = sideMenuSectionUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validation.data;

    const existingSection = await prisma.sideMenuSection.findUnique({
      where: { id },
    });

    if (!existingSection) {
      return NextResponse.json(
        { error: "섹션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const section = await prisma.sideMenuSection.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Update section error:", error);
    return NextResponse.json(
      { error: "섹션 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 사이드 메뉴 섹션 삭제
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
        { error: "섹션 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const existingSection = await prisma.sideMenuSection.findUnique({
      where: { id },
    });

    if (!existingSection) {
      return NextResponse.json(
        { error: "섹션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 하위 아이템과 함께 삭제 (onDelete: Cascade)
    await prisma.sideMenuSection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete section error:", error);
    return NextResponse.json(
      { error: "섹션 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
