import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { z } from "zod";

// 댓글 생성 스키마
const createCommentSchema = z.object({
  startXPath: z.string().min(1),
  startOffset: z.number().int().min(0),
  endXPath: z.string().min(1),
  endOffset: z.number().int().min(0),
  selectedText: z.string().min(1),
  content: z.string().min(1).max(2000),
});

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * 포스트 댓글 목록 조회 (공개)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

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

    // 댓글 목록 조회 (작성자 정보 포함)
    const comments = await prisma.postComment.findMany({
      where: { postId: post.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            linkedMember: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 응답 형식으로 변환
    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      startXPath: comment.startXPath,
      startOffset: comment.startOffset,
      endXPath: comment.endXPath,
      endOffset: comment.endOffset,
      selectedText: comment.selectedText,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.author.id,
        name: comment.author.linkedMember?.name || comment.author.name || "익명",
        avatarUrl: comment.author.linkedMember?.avatarUrl || comment.author.image,
      },
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "댓글 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 포스트 댓글 생성 (TEAM_MEMBER 이상)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasTeamAccess())) {
      return NextResponse.json(
        { error: "팀원만 댓글을 작성할 수 있습니다." },
        { status: 403 }
      );
    }

    const { slug } = await context.params;

    // 포스트 확인
    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "포스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // PUBLISHED 상태인 포스트에만 댓글 가능
    if (post.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "발행된 포스트에만 댓글을 작성할 수 있습니다." },
        { status: 400 }
      );
    }

    // 요청 바디 검증
    const body = await request.json();
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "유효성 검사 실패", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // 현재 사용자 조회
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        name: true,
        image: true,
        linkedMember: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 댓글 생성
    const comment = await prisma.postComment.create({
      data: {
        postId: post.id,
        authorId: admin.id,
        ...validation.data,
      },
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        startXPath: comment.startXPath,
        startOffset: comment.startOffset,
        endXPath: comment.endXPath,
        endOffset: comment.endOffset,
        selectedText: comment.selectedText,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: admin.id,
          name: admin.linkedMember?.name || admin.name || "익명",
          avatarUrl: admin.linkedMember?.avatarUrl || admin.image,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "댓글 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
