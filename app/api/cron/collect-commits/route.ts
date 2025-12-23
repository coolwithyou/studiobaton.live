import { NextRequest, NextResponse } from "next/server";
import { collectDailyCommits } from "@/lib/github";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 전날 날짜 (KST 기준)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // 커밋 수집
    const commits = await collectDailyCommits(yesterday);

    if (commits.length === 0) {
      return NextResponse.json({
        success: true,
        message: "수집된 커밋이 없습니다.",
        date: yesterday.toISOString(),
      });
    }

    // 해당 날짜의 Post가 이미 있는지 확인
    const existingPost = await prisma.post.findFirst({
      where: {
        targetDate: {
          gte: new Date(yesterday.setHours(0, 0, 0, 0)),
          lt: new Date(yesterday.setHours(23, 59, 59, 999)),
        },
      },
    });

    let post;
    if (existingPost) {
      post = existingPost;
    } else {
      // 새 Post 생성
      post = await prisma.post.create({
        data: {
          targetDate: yesterday,
          status: "DRAFT",
        },
      });
    }

    // 커밋 저장 (중복 제외)
    for (const commit of commits) {
      await prisma.commitLog.upsert({
        where: { sha: commit.sha },
        update: {
          postId: post.id,
        },
        create: {
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
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      commitsCollected: commits.length,
      date: yesterday.toISOString(),
    });
  } catch (error) {
    console.error("Collect commits error:", error);
    return NextResponse.json(
      { error: "커밋 수집 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
