import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import {
  sideMenuItemCreateSchema,
  sideMenuItemUpdateSchema,
  formatZodError,
} from "@/lib/validation";

/**
 * 사이드 메뉴 아이템 생성
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
    const validation = sideMenuItemCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const {
      sectionId,
      title,
      displayOrder,
      isActive,
      linkType,
      internalPath,
      externalUrl,
      contentTypeId,
      postCategory,
      customSlug,
      activePattern,
    } = validation.data;

    // 섹션 존재 확인
    const section = await prisma.sideMenuSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      return NextResponse.json(
        { error: "섹션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // contentTypeId 사용 시 존재 확인
    if (contentTypeId) {
      const contentType = await prisma.contentType.findUnique({
        where: { id: contentTypeId },
      });
      if (!contentType) {
        return NextResponse.json(
          { error: "콘텐츠 타입을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    const item = await prisma.sideMenuItem.create({
      data: {
        sectionId,
        title,
        displayOrder,
        isActive,
        linkType,
        internalPath: linkType === "INTERNAL" ? internalPath : null,
        externalUrl: linkType === "EXTERNAL" ? externalUrl : null,
        // contentTypeId가 있으면 사용, 없으면 기존 postCategory/customSlug 사용 (하위 호환)
        contentTypeId: linkType === "POST_CATEGORY" ? contentTypeId : null,
        postCategory: linkType === "POST_CATEGORY" && !contentTypeId ? postCategory : null,
        customSlug: linkType === "POST_CATEGORY" && !contentTypeId ? customSlug : null,
        activePattern: linkType === "INTERNAL" ? activePattern : null,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Create item error:", error);
    return NextResponse.json(
      { error: "아이템 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 사이드 메뉴 아이템 수정
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
    const validation = sideMenuItemUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validation.data;

    const existingItem = await prisma.sideMenuItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "아이템을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 섹션 변경 시 존재 확인
    if (updateData.sectionId) {
      const section = await prisma.sideMenuSection.findUnique({
        where: { id: updateData.sectionId },
      });

      if (!section) {
        return NextResponse.json(
          { error: "섹션을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    // contentTypeId 사용 시 존재 확인
    if (updateData.contentTypeId) {
      const contentType = await prisma.contentType.findUnique({
        where: { id: updateData.contentTypeId },
      });
      if (!contentType) {
        return NextResponse.json(
          { error: "콘텐츠 타입을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    // linkType 변경 시 관련 필드 초기화
    const finalUpdateData: Record<string, unknown> = { ...updateData };
    if (updateData.linkType) {
      if (updateData.linkType !== "INTERNAL") {
        finalUpdateData.internalPath = null;
        finalUpdateData.activePattern = null;
      }
      if (updateData.linkType !== "EXTERNAL") {
        finalUpdateData.externalUrl = null;
      }
      if (updateData.linkType !== "POST_CATEGORY") {
        finalUpdateData.contentTypeId = null;
        finalUpdateData.postCategory = null;
        finalUpdateData.customSlug = null;
      }
    }

    // contentTypeId 사용 시 deprecated 필드 초기화
    if (updateData.contentTypeId) {
      finalUpdateData.postCategory = null;
      finalUpdateData.customSlug = null;
    }

    const item = await prisma.sideMenuItem.update({
      where: { id },
      data: finalUpdateData,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Update item error:", error);
    return NextResponse.json(
      { error: "아이템 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 사이드 메뉴 아이템 삭제
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
        { error: "아이템 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const existingItem = await prisma.sideMenuItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "아이템을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.sideMenuItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete item error:", error);
    return NextResponse.json(
      { error: "아이템 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
