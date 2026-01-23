import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ slug: string; commentId: string }>;
}

/**
 * 포스트 댓글 삭제 (작성자 또는 ADMIN)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, commentId } = await context.params;

    // 포스트 확인
    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 댓글 확인
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        postId: true,
        authorId: true,
        author: {
          select: { email: true },
        },
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "댓글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 해당 포스트의 댓글인지 확인
    if (comment.postId !== post.id) {
      return NextResponse.json(
        { error: "해당 포스트의 댓글이 아닙니다." },
        { status: 400 }
      );
    }

    // 권한 확인: 작성자 본인 또는 ADMIN
    const isAuthor = comment.author.email === session.user.email;
    const adminUser = await isAdmin();

    if (!isAuthor && !adminUser) {
      return NextResponse.json(
        { error: "댓글을 삭제할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 댓글 삭제
    await prisma.postComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { error: "댓글 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
