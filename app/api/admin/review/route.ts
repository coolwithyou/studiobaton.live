import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { reviewQuerySchema, formatZodError } from "@/lib/validation";
import { logError, normalizeError, AuthError, ValidationError } from "@/lib/errors";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      throw new AuthError();
    }

    const { searchParams } = new URL(request.url);

    // 입력 검증
    let params;
    try {
      params = reviewQuerySchema.parse({
        date: searchParams.get("date"),
        memberId: searchParams.get("memberId"),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("파라미터가 올바르지 않습니다.", formatZodError(error));
      }
      throw error;
    }

    const { date, memberId } = params;

    // 팀원 조회
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "팀원을 찾을 수 없습니다." },
        { status: 404 }
      );
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
        committedAt: true,
        additions: true,
        deletions: true,
        filesChanged: true,
        url: true,
        files: {
          select: {
            id: true,
            filename: true,
            status: true,
            additions: true,
            deletions: true,
            changes: true,
            patch: true,
          },
          orderBy: {
            filename: "asc",
          },
        },
      },
      orderBy: {
        committedAt: "asc",
      },
    });

    // 프로젝트 매핑 조회
    const projectMappings = await prisma.projectMapping.findMany({
      select: {
        repositoryName: true,
        displayName: true,
      },
    });

    const mappingDict = new Map(
      projectMappings.map((m) => [m.repositoryName, m.displayName])
    );

    // 리포지토리별 그룹핑
    const repositoryGroups = new Map<
      string,
      {
        name: string;
        displayName: string | null;
        commits: typeof commits;
        totalCommits: number;
        totalAdditions: number;
        totalDeletions: number;
      }
    >();

    commits.forEach((commit) => {
      if (!repositoryGroups.has(commit.repository)) {
        repositoryGroups.set(commit.repository, {
          name: commit.repository,
          displayName: mappingDict.get(commit.repository) || null,
          commits: [],
          totalCommits: 0,
          totalAdditions: 0,
          totalDeletions: 0,
        });
      }

      const group = repositoryGroups.get(commit.repository)!;
      group.commits.push(commit);
      group.totalCommits += 1;
      group.totalAdditions += commit.additions;
      group.totalDeletions += commit.deletions;
    });

    // 전체 통계
    const summary = {
      totalCommits: commits.length,
      totalAdditions: commits.reduce((sum, c) => sum + c.additions, 0),
      totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0),
    };

    return NextResponse.json({
      date: date.toISOString(),
      member: {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
      },
      repositories: Array.from(repositoryGroups.values()),
      summary,
    });
  } catch (error) {
    logError("GET /api/admin/review", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
