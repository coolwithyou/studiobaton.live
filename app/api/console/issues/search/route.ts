import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import { issueSearchSchema, formatZodError } from "@/lib/validation";
import {
  logError,
  normalizeError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors";
import { z } from "zod";
import prisma from "@/lib/prisma";

interface IssueSearchResult {
  number: number;
  title: string;
  repository: string;
  state: string;
  url: string;
  /** 표시용: #repo#123 */
  displayId: string;
}

/**
 * DB에서 이슈 목록 조회 (open 상태만, 최신 생성순)
 */
async function getIssues(): Promise<IssueSearchResult[]> {
  const issues = await prisma.issue.findMany({
    where: { state: "open" },
    orderBy: { createdAt: "desc" },
    select: {
      number: true,
      title: true,
      repository: true,
      state: true,
      url: true,
    },
  });

  return issues.map((issue): IssueSearchResult => ({
    number: issue.number,
    title: issue.title,
    repository: issue.repository,
    state: issue.state,
    url: issue.url,
    displayId: `#${issue.repository}#${issue.number}`,
  }));
}

/**
 * GET /api/console/issues/search?q=
 * 이슈 검색 (자동완성용)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("이슈 검색 권한이 없습니다.");
    }

    const { searchParams } = new URL(request.url);

    // 입력 검증
    let params;
    try {
      params = issueSearchSchema.parse({
        q: searchParams.get("q"),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          "검색어가 올바르지 않습니다.",
          formatZodError(error)
        );
      }
      throw error;
    }

    const { q } = params;
    const query = q.toLowerCase().trim();

    // 이슈 목록 조회
    const issues = await getIssues();

    // 검색어가 없으면 최대 10개 반환
    if (!query) {
      return NextResponse.json({
        issues: issues.slice(0, 10),
      });
    }

    // 검색 필터링 (제목, 레포지토리명, 이슈번호)
    const filtered = issues
      .filter((issue) => {
        const title = issue.title.toLowerCase();
        const repo = issue.repository.toLowerCase();
        const numberStr = issue.number.toString();

        return (
          title.includes(query) ||
          repo.includes(query) ||
          numberStr.includes(query) ||
          issue.displayId.toLowerCase().includes(query)
        );
      })
      .slice(0, 10); // 최대 10개

    return NextResponse.json({ issues: filtered });
  } catch (error) {
    logError("GET /api/console/issues/search", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
