/**
 * 당일 커밋 수집 Cron Job
 * 매일 17:15 KST (08:15 UTC)에 실행
 *
 * 당일 커밋 데이터를 중간에 수집하여 CommitLog에 저장합니다.
 * (포스트 생성은 하지 않고 커밋 수집만 수행)
 */

import { NextRequest, NextResponse } from "next/server";
import { collectDailyCommits } from "@/lib/github";
import prisma from "@/lib/prisma";
import { startOfDayKST, nowKST, getKSTDayRange } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 오늘 날짜 (KST 기준)
    const today = startOfDayKST(nowKST());

    // 커밋 수집
    const commits = await collectDailyCommits(today);

    if (commits.length === 0) {
      return NextResponse.json({
        success: true,
        message: "수집된 커밋이 없습니다.",
        date: today.toISOString(),
      });
    }

    // 해당 날짜의 Post가 이미 있는지 확인 (KST 기준)
    const { start, end } = getKSTDayRange(today);
    const existingPost = await prisma.post.findFirst({
      where: {
        targetDate: {
          gte: start,
          lt: end,
        },
      },
    });

    let post;
    if (existingPost) {
      post = existingPost;
    } else {
      // 새 Post 생성 (DRAFT 상태)
      post = await prisma.post.create({
        data: {
          targetDate: today,
          status: "DRAFT",
        },
      });
    }

    // 커밋 저장 (중복 제외)
    let newCommits = 0;
    let updatedCommits = 0;

    for (const commit of commits) {
      const existing = await prisma.commitLog.findUnique({
        where: { sha: commit.sha },
      });

      if (existing) {
        // 기존 커밋은 postId만 업데이트
        await prisma.commitLog.update({
          where: { sha: commit.sha },
          data: { postId: post.id },
        });
        updatedCommits++;
      } else {
        // 새 커밋 생성
        await prisma.commitLog.create({
          data: {
            sha: commit.sha,
            repository: commit.repository,
            message: commit.message,
            author: commit.author,
            authorEmail: commit.authorEmail,
            authorAvatar: commit.authorAvatar,
            committedAt: commit.committedAt,
            additions: commit.additions,
            deletions: commit.deletions,
            filesChanged: commit.filesChanged,
            url: commit.url,
            postId: post.id,
          },
        });
        newCommits++;
      }
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      commitsCollected: commits.length,
      newCommits,
      updatedCommits,
      date: today.toISOString(),
    });
  } catch (error) {
    console.error("Collect today commits error:", error);
    return NextResponse.json(
      { error: "당일 커밋 수집 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
