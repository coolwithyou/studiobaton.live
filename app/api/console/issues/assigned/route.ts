import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import {
  logError,
  normalizeError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors";
import { z } from "zod";
import prisma from "@/lib/prisma";

const querySchema = z.object({
  githubName: z.string().min(1, "githubName은 필수입니다."),
});

interface AssignedIssue {
  number: number;
  title: string;
  repository: string;
  url: string;
  displayId: string;
  createdAt: string;
}

/**
 * GET /api/console/issues/assigned?githubName=xxx
 * 특정 멤버에게 할당된 open 이슈 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("이슈 조회 권한이 없습니다.");
    }

    const { searchParams } = new URL(request.url);

    // 입력 검증
    let params;
    try {
      params = querySchema.parse({
        githubName: searchParams.get("githubName"),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("잘못된 요청입니다.");
      }
      throw error;
    }

    const { githubName } = params;

    // 해당 멤버에게 할당된 open 이슈 조회
    const issues = await prisma.issue.findMany({
      where: {
        state: "open",
        assignees: { has: githubName },
      },
      orderBy: { createdAt: "desc" },
      select: {
        number: true,
        title: true,
        repository: true,
        url: true,
        createdAt: true,
      },
    });

    const result: AssignedIssue[] = issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      repository: issue.repository,
      url: issue.url,
      displayId: `#${issue.repository}#${issue.number}`,
      createdAt: issue.createdAt.toISOString(),
    }));

    return NextResponse.json({ issues: result });
  } catch (error) {
    logError("GET /api/console/issues/assigned", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
