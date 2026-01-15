import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-helpers";
import { memberSchema, memberUpdateSchema } from "@/lib/validation";
import { z } from "zod";

// GET: 모든 팀원 조회
export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const members = await prisma.member.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: {
        linkedAdmin: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    // isLinked 필드 추가 (Admin과 연결 여부)
    const membersWithLink = members.map((member) => ({
      id: member.id,
      name: member.name,
      githubName: member.githubName,
      email: member.email,
      avatarUrl: member.avatarUrl,
      isActive: member.isActive,
      displayOrder: member.displayOrder,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      isLinked: !!member.linkedAdmin,
      linkedAdminEmail: member.linkedAdmin?.email ?? null,
    }));

    return NextResponse.json({ members: membersWithLink });
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// POST: 새 팀원 생성
export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = memberSchema.parse(body);

    const member = await prisma.member.create({
      data: validatedData,
    });

    return NextResponse.json({ member });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 409 }
      );
    }

    console.error("Failed to create member:", error);
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}

// PUT: 팀원 정보 업데이트
export async function PUT(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = memberUpdateSchema.parse(body);

    const member = await prisma.member.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ member });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { error: "팀원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    console.error("Failed to update member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE: 팀원 삭제
export async function DELETE(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
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

    await prisma.member.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { error: "팀원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    console.error("Failed to delete member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}
