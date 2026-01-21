import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { toDateOnlyUTC } from "@/lib/date-utils";
import { standupTaskUpdateSchema, formatZodError } from "@/lib/validation";
import {
  logError,
  normalizeError,
  AuthError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from "@/lib/errors";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * PATCH /api/console/standup/task/[taskId]
 * 할 일 수정 (완료 체크, 내용 수정, 날짜 리스케줄)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("스탠드업 기능에 접근할 권한이 없습니다.");
    }

    const { taskId } = await params;

    if (!taskId || !z.string().cuid().safeParse(taskId).success) {
      throw new ValidationError("유효하지 않은 task ID입니다.");
    }

    const body = await request.json();

    // 입력 검증
    let data;
    try {
      data = standupTaskUpdateSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          "입력 데이터가 올바르지 않습니다.",
          formatZodError(error)
        );
      }
      throw error;
    }

    // 할 일 존재 확인
    const existingTask = await prisma.standupTask.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      throw new NotFoundError("할 일");
    }

    // 업데이트 데이터 구성
    const updateData: {
      content?: string;
      repository?: string | null;
      isCompleted?: boolean;
      completedAt?: Date | null;
      dueDate?: Date;
    } = {};

    if (data.content !== undefined) {
      updateData.content = data.content;
    }

    if (data.repository !== undefined) {
      updateData.repository = data.repository;
    }

    if (data.isCompleted !== undefined) {
      updateData.isCompleted = data.isCompleted;
      updateData.completedAt = data.isCompleted ? new Date() : null;
    }

    // 날짜 리스케줄 (dueDate만 변경, originalDueDate는 불변)
    if (data.dueDate !== undefined) {
      updateData.dueDate = toDateOnlyUTC(data.dueDate);
    }

    const task = await prisma.standupTask.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({ task });
  } catch (error) {
    logError("PATCH /api/console/standup/task/[taskId]", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}

/**
 * DELETE /api/console/standup/task/[taskId]
 * 할 일 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("스탠드업 기능에 접근할 권한이 없습니다.");
    }

    const { taskId } = await params;

    if (!taskId || !z.string().cuid().safeParse(taskId).success) {
      throw new ValidationError("유효하지 않은 task ID입니다.");
    }

    // 할 일 존재 확인
    const existingTask = await prisma.standupTask.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      throw new NotFoundError("할 일");
    }

    await prisma.standupTask.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("DELETE /api/console/standup/task/[taskId]", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
