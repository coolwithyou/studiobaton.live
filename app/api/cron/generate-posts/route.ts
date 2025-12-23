import { NextRequest, NextResponse } from "next/server";
import { generateAllVersions } from "@/lib/ai";
import prisma from "@/lib/prisma";
import { VersionTone } from "@/app/generated/prisma";

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 버전이 생성되지 않은 DRAFT 상태의 Post 조회
    const postsToGenerate = await prisma.post.findMany({
      where: {
        status: "DRAFT",
        versions: {
          none: {},
        },
      },
      include: {
        commits: true,
      },
    });

    if (postsToGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        message: "생성할 포스트가 없습니다.",
      });
    }

    const results = [];

    for (const post of postsToGenerate) {
      if (post.commits.length === 0) {
        continue;
      }

      const commitSummaries = post.commits.map((c) => ({
        repository: c.repository,
        message: c.message,
        author: c.author,
        additions: c.additions,
        deletions: c.deletions,
      }));

      // 3가지 버전 생성
      const versions = await generateAllVersions(
        commitSummaries,
        post.targetDate
      );

      // 버전 저장
      for (let i = 0; i < versions.length; i++) {
        const { tone, post: generatedPost } = versions[i];
        await prisma.postVersion.create({
          data: {
            postId: post.id,
            version: i + 1,
            title: generatedPost.title,
            content: generatedPost.content,
            summary: generatedPost.summary,
            tone: tone as VersionTone,
          },
        });
      }

      results.push({
        postId: post.id,
        versionsGenerated: versions.length,
      });
    }

    return NextResponse.json({
      success: true,
      postsProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error("Generate posts error:", error);
    return NextResponse.json(
      { error: "포스트 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
