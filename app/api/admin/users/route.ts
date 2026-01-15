import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession, isAdmin } from "@/lib/auth-helpers";
import { userQuerySchema, userUpdateSchema } from "@/lib/validation";
import { z } from "zod";

// GET: 사용자 목록 조회
export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ADMIN만 사용자 목록 조회 가능
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, role, status, search } = userQuerySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      role: searchParams.get("role") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
    });

    const skip = (page - 1) * limit;

    // 검색 조건 구성
    const whereCondition: Record<string, unknown> = {};

    if (role) {
      whereCondition.role = role;
    }

    if (status) {
      whereCondition.status = status;
    }

    if (search) {
      whereCondition.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.admin.findMany({
        where: whereCondition,
        orderBy: [
          { status: "asc" }, // PENDING 먼저
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          status: true,
          createdAt: true,
          approvedBy: true,
          approvedAt: true,
        },
      }),
      prisma.admin.count({ where: whereCondition }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// PATCH: 사용자 역할/상태 변경
export async function PATCH(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ADMIN만 사용자 정보 변경 가능
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, role, status } = userUpdateSchema.parse(body);

    // 대상 사용자 조회
    const targetUser = await prisma.admin.findUnique({
      where: { id },
      select: { email: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 역할 변경 제한: @ba-ton.kr 내부 사용자만 ADMIN/TEAM_MEMBER 가능
    if (role && (role === "ADMIN" || role === "TEAM_MEMBER")) {
      if (!targetUser.email.endsWith("@ba-ton.kr")) {
        return NextResponse.json(
          { error: "외부 사용자는 ADMIN/TEAM_MEMBER 역할을 가질 수 없습니다." },
          { status: 400 }
        );
      }
    }

    // 자기 자신의 역할/상태 변경 방지
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "자신의 역할이나 상태는 변경할 수 없습니다." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (role) {
      updateData.role = role;
    }

    if (status) {
      updateData.status = status;

      // ACTIVE로 변경 시 승인 정보 기록
      if (status === "ACTIVE") {
        updateData.approvedBy = session.user.id;
        updateData.approvedAt = new Date();
      }
    }

    const user = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        approvedBy: true,
        approvedAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
