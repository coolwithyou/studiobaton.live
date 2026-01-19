import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * POST /api/admin/repositories/sync
 * GitHub에서 리포지토리 목록을 가져와 DB에 동기화
 */
export async function POST() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // GitHub에서 리포지토리 목록 조회
    const allRepos = await octokit.paginate(octokit.repos.listForOrg, {
      org: "studiobaton",
      type: "all",
      per_page: 100,
    });

    const now = new Date();

    // __deprecated__ 포함 또는 archived된 리포지토리 필터링
    const isExcludedRepo = (repo: { name: string; archived?: boolean }) =>
      repo.name.includes("__deprecated__") || repo.archived === true;

    const activeRepos = allRepos.filter((repo) => !isExcludedRepo(repo));
    const excludedRepos = allRepos.filter((repo) => isExcludedRepo(repo));

    const activeRepoNames = new Set(activeRepos.map((repo) => repo.name));
    const excludedRepoNames = excludedRepos.map((repo) => repo.name);

    // 활성 GitHub 리포지토리를 DB에 upsert
    const upsertPromises = activeRepos.map((repo) =>
      prisma.repository.upsert({
        where: { name: repo.name },
        create: {
          name: repo.name,
          description: repo.description || null,
          isPrivate: repo.private,
          url: repo.html_url,
          isDeleted: false,
          syncedAt: now,
        },
        update: {
          description: repo.description || null,
          isPrivate: repo.private,
          url: repo.html_url,
          isDeleted: false,
          syncedAt: now,
        },
      })
    );

    await Promise.all(upsertPromises);

    // GitHub에 없거나 제외 대상인 리포지토리는 isDeleted 플래그 설정
    await prisma.repository.updateMany({
      where: {
        OR: [
          // GitHub에 존재하지 않는 리포지토리
          {
            name: { notIn: Array.from(activeRepoNames) },
            isDeleted: false,
          },
          // __deprecated__ 또는 archived된 리포지토리
          {
            name: { in: excludedRepoNames },
            isDeleted: false,
          },
        ],
      },
      data: {
        isDeleted: true,
        syncedAt: now,
      },
    });

    // 동기화된 리포지토리 수 반환
    const syncedCount = activeRepos.length;
    const deletedCount = await prisma.repository.count({
      where: { isDeleted: true },
    });

    return NextResponse.json({
      success: true,
      syncedAt: now.toISOString(),
      syncedCount,
      deletedCount,
    });
  } catch (error) {
    console.error("Failed to sync repositories:", error);
    return NextResponse.json(
      { error: "Failed to sync repositories" },
      { status: 500 }
    );
  }
}
