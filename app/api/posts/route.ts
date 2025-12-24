import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isInternalUser } from "@/lib/session";
import { applyPostListMasking } from "@/lib/masking";

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await isInternalUser();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          targetDate: "desc",
        },
        skip,
        take: limit,
        include: {
          commits: {
            select: {
              id: true,
              repository: true,
              message: true,
              author: true,
              authorAvatar: true,
              additions: true,
              deletions: true,
              url: true,
            },
          },
        },
      }),
      prisma.post.count({
        where: {
          status: "PUBLISHED",
        },
      }),
    ]);

    // 마스킹 적용
    const maskedPosts = await applyPostListMasking(
      posts.map((post) => ({
        ...post,
        commits: post.commits.map((c) => ({ ...c })),
      })),
      isAuthenticated
    );

    return NextResponse.json({
      posts: maskedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch posts error:", error);
    return NextResponse.json(
      { error: "포스트를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
