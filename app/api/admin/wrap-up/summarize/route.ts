import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { commitSummarizeSchema, formatZodError } from "@/lib/validation";
import { analyzeCommitHighlights } from "@/lib/ai";
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
 * POST /api/admin/wrap-up/summarize
 * AI 커밋 하이라이트 분석
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("랩업 기능에 접근할 권한이 없습니다.");
    }

    const body = await request.json();

    // 입력 검증
    let data;
    try {
      data = commitSummarizeSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          "입력 데이터가 올바르지 않습니다.",
          formatZodError(error)
        );
      }
      throw error;
    }

    const { date, memberId } = data;

    // 팀원 확인
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, email: true },
    });

    if (!member) {
      throw new NotFoundError("팀원");
    }

    // 해당 날짜의 커밋 조회 (파일 정보 포함)
    const commits = await prisma.commitLog.findMany({
      where: {
        authorEmail: member.email,
        committedAt: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
      select: {
        sha: true,
        repository: true,
        message: true,
        additions: true,
        deletions: true,
        filesChanged: true,
        files: {
          select: {
            filename: true,
            status: true,
            additions: true,
            deletions: true,
            patch: true,
          },
          take: 10, // 파일은 최대 10개까지만
        },
      },
      orderBy: {
        committedAt: "asc",
      },
    });

    if (commits.length === 0) {
      return NextResponse.json({
        summary: {
          totalCommits: 0,
          highlightCount: 0,
          primaryFocus: "오늘 커밋 내역이 없습니다.",
        },
        highlights: [],
        techDebtNotes: [],
      });
    }

    // AI 분석
    const result = await analyzeCommitHighlights(commits);

    return NextResponse.json(result);
  } catch (error) {
    logError("POST /api/admin/wrap-up/summarize", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
