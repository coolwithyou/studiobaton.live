import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { startOfDayKST, endOfDayKST } from "@/lib/date-utils";
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
 * GET /api/console/wrap-up/summarize
 * 저장된 AI 커밋 하이라이트 조회
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("랩업 기능에 접근할 권한이 없습니다.");
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const memberId = searchParams.get("memberId");

    if (!dateStr || !memberId) {
      throw new ValidationError("date와 memberId가 필요합니다.");
    }

    const date = new Date(dateStr);

    // 저장된 요약 조회
    const summary = await prisma.commitSummary.findUnique({
      where: {
        memberId_date: {
          memberId,
          date: startOfDayKST(date),
        },
      },
      include: {
        highlights: {
          orderBy: { rank: "asc" },
        },
      },
    });

    if (!summary) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      summary: {
        totalCommits: summary.totalCommits,
        highlightCount: summary.highlightCount,
        primaryFocus: summary.primaryFocus,
      },
      highlights: summary.highlights.map((h) => ({
        rank: h.rank,
        commitHash: h.commitHash,
        category: h.category,
        title: h.title,
        description: h.description,
        impact: h.impact,
      })),
      techDebtNotes: summary.techDebtNotes,
      updatedAt: summary.updatedAt,
    });
  } catch (error) {
    logError("GET /api/console/wrap-up/summarize", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}

/**
 * POST /api/console/wrap-up/summarize
 * AI 커밋 하이라이트 분석 및 저장 (재생성 시 덮어쓰기)
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

    const { date, memberId, regenerate } = data;
    const targetDate = startOfDayKST(date);

    // 재생성이 아니고 기존 데이터가 있으면 반환
    if (!regenerate) {
      const existing = await prisma.commitSummary.findUnique({
        where: {
          memberId_date: {
            memberId,
            date: targetDate,
          },
        },
        include: {
          highlights: {
            orderBy: { rank: "asc" },
          },
        },
      });

      if (existing) {
        return NextResponse.json({
          summary: {
            totalCommits: existing.totalCommits,
            highlightCount: existing.highlightCount,
            primaryFocus: existing.primaryFocus,
          },
          highlights: existing.highlights.map((h) => ({
            rank: h.rank,
            commitHash: h.commitHash,
            category: h.category,
            title: h.title,
            description: h.description,
            impact: h.impact,
          })),
          techDebtNotes: existing.techDebtNotes,
        });
      }
    }

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
          gte: startOfDayKST(date),
          lte: endOfDayKST(date),
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

    // 기존 데이터 삭제 후 새로 생성 (upsert)
    await prisma.$transaction(async (tx) => {
      // 기존 요약이 있으면 삭제 (Cascade로 highlights도 삭제됨)
      await tx.commitSummary.deleteMany({
        where: {
          memberId,
          date: targetDate,
        },
      });

      // 새로 생성
      await tx.commitSummary.create({
        data: {
          memberId,
          date: targetDate,
          totalCommits: result.summary.totalCommits,
          highlightCount: result.summary.highlightCount,
          primaryFocus: result.summary.primaryFocus,
          techDebtNotes: result.techDebtNotes || [],
          highlights: {
            create: result.highlights.map((h) => ({
              rank: h.rank,
              commitHash: h.commitHash,
              category: h.category,
              title: h.title,
              description: h.description,
              impact: h.impact,
            })),
          },
        },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    logError("POST /api/console/wrap-up/summarize", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
