import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
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

    return NextResponse.json(post);
  } catch (error) {
    console.error("Fetch post error:", error);
    return NextResponse.json(
      { error: "포스트를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
