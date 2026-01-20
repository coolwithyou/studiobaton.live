import { collectDailyCommits } from "./github";
import { generateAllVersions, generatePostVersion, AIError, AIErrorDetails } from "./ai";
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

// ============================================
// 커밋 수집 전용 함수
// ============================================

export interface CollectCommitsResult {
  success: boolean;
  postId?: string;
  newCommitsCount: number;
  existingCommitsCount: number;
  totalCommitsCount: number;
  error?: string;
}

/**
 * 특정 날짜의 커밋을 수집하고 Post를 생성 (버전 생성 없음)
 * - 이미 수집된 커밋은 스킵하고 새 커밋만 추가
 */
export async function collectCommitsForDate(
  targetDate: Date
): Promise<CollectCommitsResult> {
  // KST 기준 하루 범위
  const { start: startOfDay, end: endOfDay } = getKSTDayRange(targetDate);

  // 1. GitHub에서 커밋 수집
  const commits = await collectDailyCommits(targetDate);

  if (commits.length === 0) {
    return {
      success: false,
      newCommitsCount: 0,
      existingCommitsCount: 0,
      totalCommitsCount: 0,
      error: "해당 날짜에 커밋이 없습니다.",
    };
  }

  // 2. 기존 Post 확인 또는 생성
  let existingPost = await prisma.post.findFirst({
    where: {
      targetDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    include: { commits: true },
  });

  let postId: string;
  let existingCommitsCount = 0;

  if (!existingPost) {
    // 새 Post 생성 (버전 없이)
    const newPost = await prisma.post.create({
      data: {
        targetDate: startOfDay,
        status: "DRAFT",
      },
    });
    postId = newPost.id;
  } else {
    postId = existingPost.id;
    existingCommitsCount = existingPost.commits.length;
  }

  // 3. 기존 커밋 SHA 목록
  const existingShas = new Set(
    existingPost?.commits.map((c) => c.sha) || []
  );

  // 4. 새 커밋만 필터링
  const newCommits = commits.filter((c) => !existingShas.has(c.sha));

  // 5. 새 커밋 저장 (트랜잭션으로 커밋과 파일을 함께 저장)
  for (const commit of newCommits) {
    await prisma.$transaction(async (tx) => {
      await tx.commitLog.create({
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
          postId,
        },
      });

      if (commit.files && commit.files.length > 0) {
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

  return {
    success: true,
    postId,
    newCommitsCount: newCommits.length,
    existingCommitsCount,
    totalCommitsCount: existingCommitsCount + newCommits.length,
  };
}

// ============================================
// 버전 생성 전용 함수
// ============================================

export interface GenerateVersionResult {
  success: boolean;
  postId?: string;
  versionId?: string;
  tone: VersionTone;
  error?: string;
  errorDetails?: AIErrorDetails;
}

/**
 * 특정 Post에 대해 지정된 톤의 버전을 생성
 * - Post의 커밋을 기반으로 AI 글 생성
 * - 이미 해당 톤의 버전이 있으면 에러 반환 (forceRegenerate=true면 기존 버전 삭제 후 재생성)
 */
export async function generateVersionForPost(
  postId: string,
  tone: VersionTone = "PROFESSIONAL",
  forceRegenerate: boolean = false
): Promise<GenerateVersionResult> {
  // 1. Post와 커밋 조회
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { commits: true, versions: true },
  });

  if (!post) {
    return { success: false, postId, tone, error: "Post를 찾을 수 없습니다." };
  }

  if (post.commits.length === 0) {
    return { success: false, postId, tone, error: "수집된 커밋이 없습니다." };
  }

  // 2. 이미 해당 톤의 버전이 있는지 확인
  const existingVersion = post.versions.find((v) => v.tone === tone);
  let reuseVersionNumber: number | null = null;

  if (existingVersion) {
    if (!forceRegenerate) {
      const toneLabel = tone === "PROFESSIONAL" ? "전문적" : tone === "CASUAL" ? "캐주얼" : "기술적";
      return {
        success: false,
        postId,
        tone,
        error: `${toneLabel} 버전이 이미 존재합니다.`
      };
    }
    // forceRegenerate=true면 기존 버전 번호 저장 후 삭제
    reuseVersionNumber = existingVersion.version;
    await prisma.postVersion.delete({ where: { id: existingVersion.id } });
  }

  // 3. AI 글 생성
  const commitSummaries = post.commits.map((c) => ({
    repository: c.repository,
    message: c.message,
    author: c.author,
    additions: c.additions,
    deletions: c.deletions,
  }));

  let generatedPost;
  try {
    generatedPost = await generatePostVersion(commitSummaries, post.targetDate, tone);
  } catch (error) {
    if (error instanceof AIError) {
      return {
        success: false,
        postId,
        tone,
        error: error.details.message,
        errorDetails: error.details,
      };
    }
    return {
      success: false,
      postId,
      tone,
      error: error instanceof Error ? error.message : "AI 글 생성 중 알 수 없는 오류가 발생했습니다.",
    };
  }

  // 4. 버전 저장 (재생성 시 기존 버전 번호 유지)
  const nextVersion = reuseVersionNumber ?? post.versions.length + 1;
  const version = await prisma.postVersion.create({
    data: {
      postId,
      version: nextVersion,
      title: generatedPost.title,
      content: generatedPost.content,
      summary: generatedPost.summary,
      suggestedSlug: generatedPost.slug,
      tone,
    },
  });

  return {
    success: true,
    postId,
    versionId: version.id,
    tone,
  };
}

// ============================================
// 기존 함수 (호환성 유지)
// ============================================

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
        suggestedSlug: generatedPost.slug,
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
