import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { startOfDayKST } from "@/lib/date-utils";
import {
  standupQuerySchema,
  standupTaskSchema,
  formatZodError,
} from "@/lib/validation";
import {
  logError,
  normalizeError,
  AuthError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from "@/lib/errors";
import { z } from "zod";

/**
 * GET /api/admin/standup?date=&memberId=
 * 특정 날짜의 팀원 스탠드업 조회
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("스탠드업 기능에 접근할 권한이 없습니다.");
    }

    const { searchParams } = new URL(request.url);

    // 입력 검증
    let params;
    try {
      params = standupQuerySchema.parse({
        date: searchParams.get("date"),
        memberId: searchParams.get("memberId"),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          "파라미터가 올바르지 않습니다.",
          formatZodError(error)
        );
      }
      throw error;
    }

    const { date, memberId } = params;
    const targetDate = startOfDayKST(date);

    // 팀원 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, avatarUrl: true },
    });

    if (!member) {
      throw new NotFoundError("팀원");
    }

    // 스탠드업 조회 (없으면 빈 tasks 반환)
    const standup = await prisma.standup.findUnique({
      where: {
        memberId_date: {
          memberId,
          date: targetDate,
        },
      },
      include: {
        tasks: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    return NextResponse.json({
      date: targetDate.toISOString(),
      member,
      standup: standup
        ? {
            id: standup.id,
            tasks: standup.tasks,
          }
        : null,
    });
  } catch (error) {
    logError("GET /api/admin/standup", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}

/**
 * POST /api/admin/standup
 * 스탠드업 할 일 추가
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("스탠드업 기능에 접근할 권한이 없습니다.");
    }

    const body = await request.json();

    // 입력 검증
    let data;
    try {
      data = standupTaskSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          "입력 데이터가 올바르지 않습니다.",
          formatZodError(error)
        );
      }
      throw error;
    }

    const { date, memberId, content, repository } = data;
    const targetDate = startOfDayKST(date);

    // 팀원 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundError("팀원");
    }

    // 스탠드업 생성 또는 조회
    const standup = await prisma.standup.upsert({
      where: {
        memberId_date: {
          memberId,
          date: targetDate,
        },
      },
      create: {
        memberId,
        date: targetDate,
      },
      update: {},
    });

    // 다음 displayOrder 계산
    const lastTask = await prisma.standupTask.findFirst({
      where: { standupId: standup.id },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });

    const nextOrder = (lastTask?.displayOrder ?? -1) + 1;

    // 할 일 추가
    const task = await prisma.standupTask.create({
      data: {
        standupId: standup.id,
        content,
        repository: repository ?? null,
        displayOrder: nextOrder,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    logError("POST /api/admin/standup", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
