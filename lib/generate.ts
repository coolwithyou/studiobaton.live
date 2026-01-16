import { collectDailyCommits } from "./github";
import { generateAllVersions, AIError, AIErrorDetails } from "./ai";
import prisma from "./prisma";
import { VersionTone } from "@/app/generated/prisma";
import { getKSTDayRange, startOfDayKST } from "@/lib/date-utils";

export interface GenerateResult {
  success: boolean;
  postId?: string;
  commitsCollected: number;
  versionsGenerated: number;
  error?: string;
  errorDetails?: AIErrorDetails;
  skipped?: boolean;
}

export async function generatePostForDate(
  targetDate: Date,
  forceRegenerate: boolean = false
): Promise<GenerateResult> {
  // KST 기준 하루 범위
  const { start: startOfDay, end: endOfDay } = getKSTDayRange(targetDate);

  // 1. 기존 Post 확인
  const existingPost = await prisma.post.findFirst({
    where: {
      targetDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    include: { versions: true },
  });

  if (existingPost && !forceRegenerate) {
    return {
      success: true,
      postId: existingPost.id,
      commitsCollected: 0,
      versionsGenerated: existingPost.versions.length,
      skipped: true,
      error: "이미 Post가 존재합니다.",
    };
  }

  // 2. 커밋 수집
  const commits = await collectDailyCommits(targetDate);

  if (commits.length === 0) {
    return {
      success: false,
      commitsCollected: 0,
      versionsGenerated: 0,
      error: "해당 날짜에 커밋이 없습니다.",
    };
  }

  // 3. Post 생성 또는 재사용
  let postId: string;
  if (forceRegenerate && existingPost) {
    // 기존 버전 삭제
    await prisma.postVersion.deleteMany({
      where: { postId: existingPost.id },
    });
    postId = existingPost.id;
  } else if (!existingPost) {
    const newPost = await prisma.post.create({
      data: {
        targetDate: startOfDay,
        status: "DRAFT",
      },
    });
    postId = newPost.id;
  } else {
    postId = existingPost.id;
  }

  // 4. 커밋 저장 (중복 제외) - 트랜잭션으로 커밋과 파일을 함께 저장
  for (const commit of commits) {
    await prisma.$transaction(async (tx) => {
      // 커밋 upsert
      await tx.commitLog.upsert({
        where: { sha: commit.sha },
        update: { postId },
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
          postId,
        },
      });

      // 기존 파일 삭제 후 새로 생성 (upsert 대신 deleteMany + createMany)
      if (commit.files && commit.files.length > 0) {
        await tx.commitFile.deleteMany({
          where: { commitSha: commit.sha },
        });

        await tx.commitFile.createMany({
          data: commit.files.map((file) => ({
            commitSha: commit.sha,
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch,
          })),
        });
      }
    });
  }

  // 5. AI 글 생성
  const commitSummaries = commits.map((c) => ({
    repository: c.repository,
    message: c.message,
    author: c.author,
    additions: c.additions,
    deletions: c.deletions,
  }));

  let versions;
  try {
    versions = await generateAllVersions(commitSummaries, targetDate);
  } catch (error) {
    // AI 에러인 경우 상세 정보 반환
    if (error instanceof AIError) {
      return {
        success: false,
        postId,
        commitsCollected: commits.length,
        versionsGenerated: 0,
        error: error.details.message,
        errorDetails: error.details,
      };
    }
    // 기타 에러
    return {
      success: false,
      postId,
      commitsCollected: commits.length,
      versionsGenerated: 0,
      error: error instanceof Error ? error.message : "AI 글 생성 중 알 수 없는 오류가 발생했습니다.",
    };
  }

  // 6. 버전 저장
  for (let i = 0; i < versions.length; i++) {
    const { tone, post: generatedPost } = versions[i];
    await prisma.postVersion.create({
      data: {
        postId,
        version: i + 1,
        title: generatedPost.title,
        content: generatedPost.content,
        summary: generatedPost.summary,
        tone: tone as VersionTone,
      },
    });
  }

  return {
    success: true,
    postId,
    commitsCollected: commits.length,
    versionsGenerated: versions.length,
  };
}

export async function getCommitCountForDate(date: Date): Promise<number> {
  const commits = await collectDailyCommits(date);
  return commits.length;
}
