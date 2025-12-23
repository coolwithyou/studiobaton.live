import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionData();

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {};

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: {
          targetDate: "desc",
        },
        skip,
        take: limit,
        include: {
          versions: {
            select: {
              id: true,
              version: true,
              title: true,
              tone: true,
              isSelected: true,
            },
          },
          commits: {
            select: {
              id: true,
              repository: true,
            },
          },
          _count: {
            select: {
              commits: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch admin posts error:", error);
    return NextResponse.json(
      { error: "포스트를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
