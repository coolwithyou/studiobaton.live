import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * 공개용 사이드 메뉴 조회
 * 활성화된 섹션과 아이템만 반환
 */
export async function GET() {
  try {
    const sections = await prisma.sideMenuSection.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            title: true,
            linkType: true,
            internalPath: true,
            externalUrl: true,
            postCategory: true,
          },
        },
      },
    });

    // 아이템이 없는 섹션 필터링
    const filteredSections = sections.filter(
      (section) => section.items.length > 0
    );

    return NextResponse.json({ sections: filteredSections });
  } catch (error) {
    console.error("Get sidemenu error:", error);
    return NextResponse.json(
      { error: "메뉴를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
