import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { reorderSchema, formatZodError } from "@/lib/validation";

/**
 * 사이드 메뉴 섹션 순서 변경
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "sections" or "items"

    if (!type || (type !== "sections" && type !== "items")) {
      return NextResponse.json(
        { error: "유효한 type을 지정해주세요 (sections 또는 items)." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = reorderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    // 트랜잭션으로 일괄 업데이트
    if (type === "sections") {
      await prisma.$transaction(
        items.map((item) =>
          prisma.sideMenuSection.update({
            where: { id: item.id },
            data: { displayOrder: item.displayOrder },
          })
        )
      );
    } else {
      await prisma.$transaction(
        items.map((item) =>
          prisma.sideMenuItem.update({
            where: { id: item.id },
            data: { displayOrder: item.displayOrder },
          })
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { error: "순서 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
