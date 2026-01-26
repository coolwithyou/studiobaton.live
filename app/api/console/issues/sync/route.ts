import { NextResponse } from "next/server";
import { getServerSession, hasTeamAccess } from "@/lib/auth-helpers";
import { fetchOrgIssues } from "@/lib/github";
import prisma from "@/lib/prisma";
import {
  logError,
  normalizeError,
  AuthError,
  ForbiddenError,
} from "@/lib/errors";

/**
 * POST /api/console/issues/sync
 * GitHub에서 open 이슈 목록을 가져와 DB에 동기화
 */
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      throw new AuthError();
    }

    if (!(await hasTeamAccess())) {
      throw new ForbiddenError("이슈 동기화 권한이 없습니다.");
    }

    const now = new Date();

    // GitHub에서 open 이슈 조회
    const issues = await fetchOrgIssues();

    // 이슈 upsert
    const upsertPromises = issues.map((issue) =>
      prisma.issue.upsert({
        where: {
          repository_number: {
            repository: issue.repository,
            number: issue.number,
          },
        },
        create: {
          number: issue.number,
          title: issue.title,
          repository: issue.repository,
          state: issue.state,
          url: issue.url,
          createdAt: issue.createdAt,
          syncedAt: now,
        },
        update: {
          title: issue.title,
          state: issue.state,
          url: issue.url,
          syncedAt: now,
        },
      })
    );

    await Promise.all(upsertPromises);

    // GitHub에 없는 open 이슈 (닫힌 이슈)는 상태 업데이트
    const openIssueKeys = new Set(
      issues.map((i) => `${i.repository}:${i.number}`)
    );

    const dbOpenIssues = await prisma.issue.findMany({
      where: { state: "open" },
      select: { id: true, repository: true, number: true },
    });

    const closedIssueIds = dbOpenIssues
      .filter((i) => !openIssueKeys.has(`${i.repository}:${i.number}`))
      .map((i) => i.id);

    if (closedIssueIds.length > 0) {
      await prisma.issue.updateMany({
        where: { id: { in: closedIssueIds } },
        data: { state: "closed", syncedAt: now },
      });
    }

    const syncedCount = issues.length;
    const closedCount = closedIssueIds.length;

    return NextResponse.json({
      success: true,
      syncedAt: now.toISOString(),
      syncedCount,
      closedCount,
    });
  } catch (error) {
    logError("POST /api/console/issues/sync", error);
    const normalizedError = normalizeError(error);

    return NextResponse.json(
      { error: normalizedError.message },
      { status: normalizedError.status }
    );
  }
}
