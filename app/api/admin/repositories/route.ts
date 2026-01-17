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
      orderBy: { name: "asc" },
    });

    const projectMappings = await prisma.projectMapping.findMany();
    const mappingByRepo = new Map(
      projectMappings.map((m) => [m.repositoryName, m])
    );

    // 마지막 동기화 시간 조회
    const lastSynced = repositories[0]?.syncedAt || null;

    const repoList = repositories.map((repo) => {
      const mapping = mappingByRepo.get(repo.name);
      return {
        name: repo.name,
        description: repo.description || "",
        isPrivate: repo.isPrivate,
        url: repo.url,
        syncedAt: repo.syncedAt,
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
