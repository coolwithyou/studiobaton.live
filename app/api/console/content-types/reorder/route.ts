import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { reorderSchema, formatZodError } from "@/lib/validation";

/**
 * 콘텐츠 타입 순서 변경
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
    const validation = reorderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    // 트랜잭션으로 순서 업데이트
    await prisma.$transaction(
      items.map((item) =>
        prisma.contentType.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder content types error:", error);
    return NextResponse.json(
      { error: "순서 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
