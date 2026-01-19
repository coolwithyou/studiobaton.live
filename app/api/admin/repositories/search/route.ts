import { NextRequest, NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import { repoSearchSchema, formatZodError } from "@/lib/validation";
import {
  logError,
  normalizeError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors";
import { z } from "zod";
import prisma from "@/lib/prisma";

interface RepoSearchResult {
  name: string;
  fullName: string;
  description: string | null;
}

/**
 * DB에서 레포지토리 목록 조회 (isDeleted: false만)
 */
async function getRepositories(): Promise<RepoSearchResult[]> {
  const repos = await prisma.repository.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
    select: {
      name: true,
      description: true,
    },
  });

  return repos.map((repo): RepoSearchResult => ({
    name: repo.name,
    fullName: `studiobaton/${repo.name}`,
    description: repo.description,
  }));
}

/**
 * GET /api/admin/repositories/search?q=
 * 레포지토리 검색 (자동완성용)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("레포지토리 검색 권한이 없습니다.");
    }

    const { searchParams } = new URL(request.url);

    // 입력 검증
    let params;
    try {
      params = repoSearchSchema.parse({
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

    // 레포지토리 목록 조회
    const repositories = await getRepositories();

    // 검색어가 없으면 최대 10개 반환
    if (!query) {
      return NextResponse.json({
        repositories: repositories.slice(0, 10),
      });
    }

    // 검색 필터링
    const filtered = repositories
      .filter((repo) => {
        const name = repo.name.toLowerCase();
        const fullName = repo.fullName.toLowerCase();
        const description = repo.description?.toLowerCase() || "";

        return (
          name.includes(query) ||
          fullName.includes(query) ||
          description.includes(query)
        );
      })
      .slice(0, 10); // 최대 10개

    return NextResponse.json({ repositories: filtered });
  } catch (error) {
    logError("GET /api/admin/repositories/search", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
