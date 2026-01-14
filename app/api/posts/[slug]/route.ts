import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isInternalUser } from "@/lib/auth-helpers";
import { applyPostMaskingAsync } from "@/lib/masking";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const isAuthenticated = await isInternalUser();
    const { slug } = await params;

    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        commits: {
          orderBy: {
            committedAt: "asc",
          },
        },
        publishedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!post || post.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 마스킹 적용
    const maskedPost = await applyPostMaskingAsync(
      {
        ...post,
        commits: post.commits.map((c) => ({
          id: c.id,
          repository: c.repository,
          message: c.message,
          author: c.author,
          authorAvatar: c.authorAvatar,
          additions: c.additions,
          deletions: c.deletions,
          url: c.url,
          committedAt: c.committedAt,
        })),
      },
      isAuthenticated
    );

    return NextResponse.json(maskedPost);
  } catch (error) {
    console.error("Fetch post error:", error);
    return NextResponse.json(
      { error: "포스트를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
