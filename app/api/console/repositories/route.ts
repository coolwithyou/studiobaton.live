import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

/**
 * GET /api/console/repositories
 * DB에서 리포지토리 목록 조회 (ProjectMapping 정보 포함)
 * - 조직 레포지토리 + 멤버들의 외부 레포지토리 모두 포함
 */
export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. 조직 리포지토리 조회
    const repositories = await prisma.repository.findMany({
      where: { isDeleted: false },
    });

    // 2. 멤버들의 외부 레포지토리 조회 (중복 제거)
    const membersWithExternalRepos = await prisma.member.findMany({
      where: {
        isActive: true,
        externalRepos: { isEmpty: false },
      },
      select: { externalRepos: true },
    });

    const externalRepoSet = new Set<string>();
    for (const member of membersWithExternalRepos) {
      for (const repo of member.externalRepos) {
        externalRepoSet.add(repo);
      }
    }

    // 3. ProjectMapping 조회
    const projectMappings = await prisma.projectMapping.findMany();
    const mappingByRepo = new Map(
      projectMappings.map((m) => [m.repositoryName, m])
    );

    // 4. 각 리포지토리별 최신 커밋 날짜 조회
    const latestCommits = await prisma.commitLog.groupBy({
      by: ["repository"],
      _max: {
        committedAt: true,
      },
    });
    const latestCommitByRepo = new Map(
      latestCommits.map((c) => [c.repository, c._max.committedAt])
    );

    // 5. 마지막 동기화 시간 조회
    const lastSynced = repositories[0]?.syncedAt || null;

    // 6. 조직 레포 목록 생성
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
        isExternal: false, // 조직 레포
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

    // 7. 외부 레포 목록 추가
    for (const externalRepo of externalRepoSet) {
      const mapping = mappingByRepo.get(externalRepo);
      const lastCommitAt = latestCommitByRepo.get(externalRepo) || null;
      repoList.push({
        name: externalRepo,
        description: "",
        isPrivate: true, // 외부 레포는 프라이빗 여부 알 수 없음
        url: `https://github.com/${externalRepo}`,
        syncedAt: null as unknown as Date,
        lastCommitAt: lastCommitAt?.toISOString() || null,
        isExternal: true, // 외부 레포
        mapping: mapping
          ? {
              id: mapping.id,
              displayName: mapping.displayName,
              maskName: mapping.maskName,
              description: mapping.description,
              isActive: mapping.isActive,
            }
          : null,
      });
    }

    // 8. 최신 커밋 순으로 정렬 (커밋이 없는 리포지토리는 뒤로)
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
