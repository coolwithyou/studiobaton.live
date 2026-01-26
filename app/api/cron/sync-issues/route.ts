/**
 * GitHub 이슈 동기화 Cron Job
 * 10분마다 실행하여 open 이슈 목록을 최신 상태로 유지
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchOrgIssues } from "@/lib/github";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
          assignees: issue.assignees,
          createdAt: issue.createdAt,
          syncedAt: now,
        },
        update: {
          title: issue.title,
          state: issue.state,
          url: issue.url,
          assignees: issue.assignees,
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

    return NextResponse.json({
      success: true,
      syncedAt: now.toISOString(),
      syncedCount: issues.length,
      closedCount: closedIssueIds.length,
    });
  } catch (error) {
    console.error("Sync issues error:", error);
    return NextResponse.json(
      { error: "이슈 동기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
