import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { toDateOnlyUTC, subDaysKST } from "@/lib/date-utils";
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
 * GET /api/console/standup?date=&memberId=&includeCarryover=&carryoverDays=
 * 특정 날짜의 팀원 스탠드업 조회 (캐리오버 할 일 포함)
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
        includeCarryover: searchParams.get("includeCarryover"),
        carryoverDays: searchParams.get("carryoverDays"),
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

    const { date, memberId, includeCarryover = true, carryoverDays = 7 } = params;
    const targetDate = toDateOnlyUTC(date);

    // 팀원 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, avatarUrl: true },
    });

    if (!member) {
      throw new NotFoundError("팀원");
    }

    // 오늘의 할 일 조회 (dueDate가 선택한 날짜인 것)
    const todayTasks = await prisma.standupTask.findMany({
      where: {
        standup: { memberId },
        dueDate: targetDate,
      },
      orderBy: { displayOrder: "asc" },
    });

    // 캐리오버 할 일 조회 (미완료 + dueDate가 오늘 이전 + carryoverDays 이내)
    let carriedOverTasks: typeof todayTasks = [];
    if (includeCarryover) {
      const carryoverStartDate = toDateOnlyUTC(subDaysKST(targetDate, carryoverDays));

      carriedOverTasks = await prisma.standupTask.findMany({
        where: {
          standup: { memberId },
          isCompleted: false,
          dueDate: {
            gte: carryoverStartDate,
            lt: targetDate,
          },
        },
        orderBy: [
          { dueDate: "asc" }, // 오래된 것이 위로
          { displayOrder: "asc" },
        ],
      });
    }

    // 해당 날짜의 스탠드업 ID 조회 (폼에서 사용)
    const standup = await prisma.standup.findUnique({
      where: {
        memberId_date: {
          memberId,
          date: targetDate,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      date: targetDate.toISOString(),
      member,
      standup: {
        id: standup?.id || null,
        tasks: todayTasks,
        carriedOverTasks,
      },
    });
  } catch (error) {
    logError("GET /api/console/standup", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}

/**
 * POST /api/console/standup
 * 스탠드업 할 일 추가 (미래 날짜 예약 지원)
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

    // 입력 검증 (dueDate 또는 date 필드 처리)
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

    const { dueDate, memberId, content, repository } = data;
    const targetDueDate = toDateOnlyUTC(dueDate);

    // 팀원 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundError("팀원");
    }

    // 스탠드업 생성 또는 조회 (dueDate 기준)
    const standup = await prisma.standup.upsert({
      where: {
        memberId_date: {
          memberId,
          date: targetDueDate,
        },
      },
      create: {
        memberId,
        date: targetDueDate,
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

    // 할 일 추가 (dueDate와 originalDueDate 모두 설정)
    const task = await prisma.standupTask.create({
      data: {
        standupId: standup.id,
        content,
        repository: repository ?? null,
        displayOrder: nextOrder,
        dueDate: targetDueDate,           // 목표 완료 날짜 (리스케줄 가능)
        originalDueDate: targetDueDate,   // 최초 작성 날짜 (불변)
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    logError("POST /api/console/standup", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
