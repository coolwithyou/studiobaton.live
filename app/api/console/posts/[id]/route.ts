import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import slugify from "slugify";
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
        contentType: {
          select: {
            slug: true,
            pluralSlug: true,
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

    // 커밋에 포함된 리포지토리들의 ProjectMapping 정보 조회
    const repositories = [...new Set(post.commits.map((c) => c.repository))];
    const repositoryMappings = await prisma.projectMapping.findMany({
      where: { repositoryName: { in: repositories } },
      select: {
        repositoryName: true,
        displayName: true,
      },
    });

    return NextResponse.json({ ...post, repositoryMappings });
  } catch (error) {
    console.error("Fetch admin post error:", error);
    return NextResponse.json(
      { error: "포스트를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    });

    if (!post) {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 관련 데이터와 함께 포스트 삭제 (Prisma cascade 또는 수동 삭제)
    await prisma.$transaction(async (tx) => {
      // PostVersion 삭제
      await tx.postVersion.deleteMany({
        where: { postId: id },
      });

      // Post-Commit 관계 해제 (커밋 자체는 삭제하지 않음)
      await tx.post.update({
        where: { id },
        data: {
          commits: {
            set: [], // 관계만 해제
          },
        },
      });

      // 포스트 삭제
      await tx.post.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { error: "포스트 삭제 중 오류가 발생했습니다." },
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
    const { action, versionId, slug: userSlug, category, showInTimeline } = body;

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
      // 발행 - 날짜 prefix 없이 slug 생성
      let slug: string;
      if (userSlug && userSlug.trim()) {
        // 사용자 입력 slug 정제 (혹시 모를 잘못된 문자 제거)
        slug = userSlug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
      } else {
        // 기존 방식: 제목에서 slugify
        slug = slugify(title || "post", {
          lower: true,
          strict: true,
        });
      }

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
          category: category || null,
          showInTimeline: showInTimeline ?? false,
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
    } else if (action === "unpublish") {
      // 발행 취소
      if (post.status !== "PUBLISHED") {
        return NextResponse.json(
          { error: "발행된 포스트만 발행 취소할 수 있습니다." },
          { status: 400 }
        );
      }

      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          title,
          content,
          summary,
          status: "DRAFT",
          slug: null,
          publishedAt: null,
          publishedById: null,
        },
      });

      return NextResponse.json(updatedPost);
    } else {
      // 업데이트만 (저장)
      // 이미 발행된 포스트의 경우 slug 변경도 처리
      let slugToUpdate: string | undefined;
      if (post.status === "PUBLISHED" && userSlug !== undefined) {
        // 사용자 입력 slug 정제
        const cleanSlug = userSlug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        // 기존 slug와 다른 경우에만 중복 검사
        if (cleanSlug !== post.slug) {
          const existingPost = await prisma.post.findFirst({
            where: {
              slug: cleanSlug,
              id: { not: id },
            },
          });

          if (existingPost) {
            return NextResponse.json(
              { error: "이미 사용 중인 URL입니다. 다른 URL을 입력해주세요." },
              { status: 400 }
            );
          }
          slugToUpdate = cleanSlug;
        }
      }

      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          title,
          content,
          summary,
          category: category || null,
          showInTimeline: showInTimeline ?? false,
          ...(slugToUpdate !== undefined && { slug: slugToUpdate }),
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
