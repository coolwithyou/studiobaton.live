import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
      where.status = status as "DRAFT" | "PUBLISHED" | "ARCHIVED";
    }

    if (search) {
      where.OR = [
        { slug: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        {
          versions: {
            some: {
              title: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: {
          targetDate: "desc",
        },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              linkedMember: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
          contentType: {
            select: {
              slug: true,
              pluralSlug: true,
            },
          },
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
