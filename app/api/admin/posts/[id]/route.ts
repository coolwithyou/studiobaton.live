import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import slugify from "slugify";
import { format } from "date-fns";
import { sanitizeMarkdown } from "@/lib/sanitize-markdown";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: {
            version: "asc",
          },
        },
        commits: {
          orderBy: {
            committedAt: "asc",
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Fetch admin post error:", error);
    return NextResponse.json(
      { error: "포스트를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // XSS 방어: 콘텐츠 sanitize
    const title = body.title ? sanitizeMarkdown(body.title) : undefined;
    const content = body.content ? sanitizeMarkdown(body.content) : undefined;
    const summary = body.summary ? sanitizeMarkdown(body.summary) : undefined;
    const { action, versionId, slug: userSlug } = body;

    const post = await prisma.post.findUnique({
      where: { id },
      include: { versions: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (action === "publish") {
      // 발행
      const dateSlug = format(post.targetDate, "yyyy-MM-dd");

      // 사용자가 입력한 slug 또는 제목 기반 자동 생성
      let slugPart: string;
      if (userSlug && userSlug.trim()) {
        // 사용자 입력 slug 정제 (혹시 모를 잘못된 문자 제거)
        slugPart = userSlug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
      } else {
        // 기존 방식: 제목에서 slugify
        slugPart = slugify(title || "post", {
          lower: true,
          strict: true,
        });
      }

      const slug = `${dateSlug}-${slugPart}`;

      // slug 중복 검사 (자신 제외)
      const existingPost = await prisma.post.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      });

      if (existingPost) {
        return NextResponse.json(
          { error: "이미 사용 중인 URL입니다. 다른 URL을 입력해주세요." },
          { status: 400 }
        );
      }

      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          title,
          content,
          summary,
          slug,
          status: "PUBLISHED",
          publishedAt: new Date(),
          publishedById: session.user.id,
        },
      });

      // 선택된 버전 표시
      if (versionId) {
        await prisma.postVersion.updateMany({
          where: { postId: id },
          data: { isSelected: false },
        });
        await prisma.postVersion.update({
          where: { id: versionId },
          data: { isSelected: true },
        });
      }

      return NextResponse.json(updatedPost);
    } else {
      // 업데이트만 (저장)
      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          title,
          content,
          summary,
        },
      });

      return NextResponse.json(updatedPost);
    }
  } catch (error) {
    console.error("Update admin post error:", error);
    return NextResponse.json(
      { error: "포스트 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
