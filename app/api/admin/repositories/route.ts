import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/repositories
 * DB에서 리포지토리 목록 조회 (ProjectMapping 정보 포함)
 */
export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Repository와 ProjectMapping 조인 조회
    const repositories = await prisma.repository.findMany({
      where: { isDeleted: false },
    });

    const projectMappings = await prisma.projectMapping.findMany();
    const mappingByRepo = new Map(
      projectMappings.map((m) => [m.repositoryName, m])
    );

    // 각 리포지토리별 최신 커밋 날짜 조회
    const latestCommits = await prisma.commitLog.groupBy({
      by: ["repository"],
      _max: {
        committedAt: true,
      },
    });
    const latestCommitByRepo = new Map(
      latestCommits.map((c) => [c.repository, c._max.committedAt])
    );

    // 마지막 동기화 시간 조회
    const lastSynced = repositories[0]?.syncedAt || null;

    const repoList = repositories.map((repo) => {
      const mapping = mappingByRepo.get(repo.name);
      const lastCommitAt = latestCommitByRepo.get(repo.name) || null;
      return {
        name: repo.name,
        description: repo.description || "",
        isPrivate: repo.isPrivate,
        url: repo.url,
        syncedAt: repo.syncedAt,
        lastCommitAt: lastCommitAt?.toISOString() || null,
        // ProjectMapping 정보
        mapping: mapping
          ? {
              id: mapping.id,
              displayName: mapping.displayName,
              maskName: mapping.maskName,
              description: mapping.description,
              isActive: mapping.isActive,
            }
          : null,
      };
    });

    // 최신 커밋 순으로 정렬 (커밋이 없는 리포지토리는 뒤로)
    repoList.sort((a, b) => {
      if (a.lastCommitAt && b.lastCommitAt) {
        return new Date(b.lastCommitAt).getTime() - new Date(a.lastCommitAt).getTime();
      }
      if (a.lastCommitAt && !b.lastCommitAt) return -1;
      if (!a.lastCommitAt && b.lastCommitAt) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      repositories: repoList,
      lastSyncedAt: lastSynced?.toISOString() || null,
    });
  } catch (error) {
    console.error("Failed to fetch repositories:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
