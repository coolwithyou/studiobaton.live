import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionData } from "@/lib/session";

// GET: 모든 프로젝트 매핑 조회
export async function GET() {
  const session = await getSessionData();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const mappings = await prisma.projectMapping.findMany({
      orderBy: { displayName: "asc" },
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error("Failed to fetch project mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch project mappings" },
      { status: 500 }
    );
  }
}

// POST: 새 프로젝트 매핑 생성
export async function POST(request: NextRequest) {
  const session = await getSessionData();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { repositoryName, displayName, description, isActive } = body;

    if (!repositoryName || !displayName) {
      return NextResponse.json(
        { error: "repositoryName and displayName are required" },
        { status: 400 }
      );
    }

    const mapping = await prisma.projectMapping.create({
      data: {
        repositoryName,
        displayName,
        description: description || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ mapping });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 등록된 리포지토리입니다." },
        { status: 409 }
      );
    }
    console.error("Failed to create project mapping:", error);
    return NextResponse.json(
      { error: "Failed to create project mapping" },
      { status: 500 }
    );
  }
}

// PUT: 프로젝트 매핑 업데이트
export async function PUT(request: NextRequest) {
  const session = await getSessionData();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, displayName, description, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const mapping = await prisma.projectMapping.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ mapping });
  } catch (error) {
    console.error("Failed to update project mapping:", error);
    return NextResponse.json(
      { error: "Failed to update project mapping" },
      { status: 500 }
    );
  }
}

// DELETE: 프로젝트 매핑 삭제
export async function DELETE(request: NextRequest) {
  const session = await getSessionData();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.projectMapping.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project mapping:", error);
    return NextResponse.json(
      { error: "Failed to delete project mapping" },
      { status: 500 }
    );
  }
}
