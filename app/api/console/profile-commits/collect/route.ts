/**
 * 프로필 통계용 과거 커밋 수집 API (SSE 스트리밍)
 * POST /api/console/profile-commits/collect
 *
 * 2022년 이후 모든 커밋을 수집하여 CommitLog에 저장합니다.
 * postId는 null로 저장되어 프로필 통계 전용으로 사용됩니다.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import {
  collectHistoricalCommits,
  getRateLimitStatus,
  CollectionProgress,
  clearCollectionLogs,
} from "@/lib/github-historical";
import { parseISO } from "date-fns";

interface ProgressEvent {
  type: "progress" | "complete" | "error" | "rate_limit";
  data: {
    phase?: string;
    currentRepo?: string;
    currentMonth?: string;
    processedRepos?: number;
    totalRepos?: number;
    processedCommits?: number;
    totalCommits?: number;
    savedCommits?: number;
    message?: string;
    error?: string;
    rateLimit?: {
      remaining: number;
      limit: number;
      reset: string;
    };
  };
}

function createSSEMessage(event: ProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: "Unauthorized" },
      }),
      {
        status: 401,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  // 관리자 권한 확인
  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email! },
  });

  if (!admin || admin.role !== "ADMIN") {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: "관리자 권한이 필요합니다." },
      }),
      {
        status: 403,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  const body = await request.json();
  const {
    startDate: startDateStr = "2022-01-01",
    endDate: endDateStr,
    includeDetails = false,
  } = body;

  const startDate = parseISO(startDateStr);
  const endDate = endDateStr ? parseISO(endDateStr) : new Date();

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: "유효하지 않은 날짜 형식입니다." },
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const send = (event: ProgressEvent) => {
        if (isClosed) return; // 이미 닫힌 경우 무시
        try {
          controller.enqueue(encoder.encode(createSSEMessage(event)));
        } catch {
          // Controller가 이미 닫힌 경우 (클라이언트 연결 끊김)
          isClosed = true;
        }
      };

      const closeController = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch {
          // 이미 닫힌 경우 무시
        }
      };

      try {
        // Rate limit 상태 확인
        const rateLimit = await getRateLimitStatus();
        send({
          type: "rate_limit",
          data: {
            message: `GitHub API 상태: ${rateLimit.remaining}/${rateLimit.limit} 남음`,
            rateLimit: {
              remaining: rateLimit.remaining,
              limit: rateLimit.limit,
              reset: rateLimit.reset.toISOString(),
            },
          },
        });

        if (rateLimit.remaining < 100) {
          send({
            type: "error",
            data: {
              error: `GitHub API rate limit이 부족합니다. ${rateLimit.reset.toLocaleString()}까지 기다려주세요.`,
            },
          });
          closeController();
          return;
        }

        // 기존 커밋 SHA 목록 조회 (중복 방지)
        send({
          type: "progress",
          data: {
            phase: "init",
            message: "기존 커밋 목록을 확인하고 있습니다...",
          },
        });

        const existingCommits = await prisma.commitLog.findMany({
          select: { sha: true },
        });
        const existingShas = new Set<string>(existingCommits.map((c: { sha: string }) => c.sha));

        send({
          type: "progress",
          data: {
            phase: "init",
            message: `기존 커밋 ${existingShas.size}개 확인 완료`,
          },
        });

        // 과거 커밋 수집
        let savedCount = 0;
        const onProgress = (progress: CollectionProgress) => {
          send({
            type: "progress",
            data: {
              phase: progress.phase,
              currentRepo: progress.currentRepo,
              currentMonth: progress.currentMonth,
              processedRepos: progress.processedRepos,
              totalRepos: progress.totalRepos,
              processedCommits: progress.processedCommits,
              totalCommits: progress.totalCommits,
              savedCommits: savedCount,
              message: progress.message,
            },
          });
        };

        const result = await collectHistoricalCommits(
          startDate,
          endDate,
          onProgress,
          {
            includeDetails,
            existingShas,
          }
        );

        // 수집된 커밋을 DB에 저장
        send({
          type: "progress",
          data: {
            phase: "saving",
            message: `${result.commits.length}개 신규 커밋을 저장합니다...`,
            processedCommits: 0,
            totalCommits: result.commits.length,
          },
        });

        // 배치로 저장 (100개씩)
        const SAVE_BATCH_SIZE = 100;
        for (let i = 0; i < result.commits.length; i += SAVE_BATCH_SIZE) {
          const batch = result.commits.slice(i, i + SAVE_BATCH_SIZE);

          await prisma.$transaction(
            batch.map((commit) =>
              prisma.commitLog.upsert({
                where: { sha: commit.sha },
                update: {
                  additions: commit.additions,
                  deletions: commit.deletions,
                  filesChanged: commit.filesChanged,
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
                  postId: null, // 프로필 통계 전용 (포스트 미연결)
                },
              })
            )
          );

          savedCount += batch.length;

          send({
            type: "progress",
            data: {
              phase: "saving",
              message: `저장 중... (${savedCount}/${result.commits.length})`,
              processedCommits: savedCount,
              totalCommits: result.commits.length,
              savedCommits: savedCount,
            },
          });
        }

        // 완료
        send({
          type: "complete",
          data: {
            message: `수집 완료: ${savedCount}개 커밋 저장됨`,
            savedCommits: savedCount,
            totalCommits: result.totalProcessed,
          },
        });

        if (result.errors.length > 0) {
          console.error("Collection errors:", result.errors);
        }
      } catch (error) {
        // 연결 끊김 에러는 무시 (클라이언트가 페이지 떠남)
        if (error instanceof Error && error.message.includes("Controller is already closed")) {
          console.log("Client disconnected during collection");
        } else {
          console.error("Profile commits collect error:", error);
          send({
            type: "error",
            data: { error: "수집 중 오류가 발생했습니다." },
          });
        }
      } finally {
        closeController();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * 수집 상태 조회 (현재 CommitLog 통계)
 */
export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // CommitLog 통계
    const stats = await prisma.commitLog.aggregate({
      _count: { id: true },
      _min: { committedAt: true },
      _max: { committedAt: true },
    });

    // 프로필 전용 커밋 수 (postId가 null인 것)
    const profileOnlyCount = await prisma.commitLog.count({
      where: { postId: null },
    });

    // Rate limit 상태
    const rateLimit = await getRateLimitStatus();

    // 레포지토리별 커밋 수
    const repoStats = await prisma.commitLog.groupBy({
      by: ["repository"],
      _count: { id: true },
      _max: { committedAt: true },
      orderBy: { _count: { id: "desc" } },
    });

    const repositories = repoStats.map((r) => ({
      name: r.repository,
      commitCount: r._count.id,
      lastCommitAt: r._max.committedAt,
    }));

    // 멤버별 커밋 수
    const members = await prisma.member.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { displayOrder: "asc" },
    });

    const memberCommits = await Promise.all(
      members.map(async (member) => ({
        ...member,
        commitCount: await prisma.commitLog.count({
          where: { authorEmail: member.email },
        }),
      }))
    );

    return Response.json({
      totalCommits: stats._count.id,
      profileOnlyCommits: profileOnlyCount,
      oldestCommit: stats._min.committedAt,
      latestCommit: stats._max.committedAt,
      rateLimit: {
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        reset: rateLimit.reset.toISOString(),
      },
      repositories,
      memberCommits,
    });
  } catch (error) {
    console.error("Error fetching commit stats:", error);
    return Response.json({ error: "통계 조회 중 오류 발생" }, { status: 500 });
  }
}

/**
 * 수집 로그 초기화 (재수집을 위해)
 */
export async function DELETE() {
  const session = await getServerSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 관리자 권한 확인
  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email! },
  });

  if (!admin || admin.role !== "ADMIN") {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  try {
    const deletedCount = await clearCollectionLogs();
    return Response.json({
      success: true,
      message: `${deletedCount}개의 수집 로그가 삭제되었습니다.`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error clearing collection logs:", error);
    return Response.json({ error: "로그 삭제 중 오류 발생" }, { status: 500 });
  }
}
