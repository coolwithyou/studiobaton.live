import { NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

/**
 * 포스트에서 사용 중인 카테고리 목록 조회
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

    // 포스트에서 사용 중인 고유 카테고리 목록 조회
    const posts = await prisma.post.findMany({
      where: {
        category: {
          not: null,
        },
      },
      select: {
        category: true,
      },
      distinct: ["category"],
    });

    const categories = posts
      .map((p) => p.category)
      .filter((c): c is string => c !== null)
      .sort();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "카테고리 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
