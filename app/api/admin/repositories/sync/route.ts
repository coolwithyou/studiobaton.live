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
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: "studiobaton",
      type: "all",
      per_page: 100,
    });

    const now = new Date();
    const githubRepoNames = new Set(repos.map((repo) => repo.name));

    // GitHub 리포지토리를 DB에 upsert
    const upsertPromises = repos.map((repo) =>
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

    // GitHub에 없는 리포지토리는 isDeleted 플래그 설정
    await prisma.repository.updateMany({
      where: {
        name: { notIn: Array.from(githubRepoNames) },
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        syncedAt: now,
      },
    });

    // 동기화된 리포지토리 수 반환
    const syncedCount = repos.length;
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
