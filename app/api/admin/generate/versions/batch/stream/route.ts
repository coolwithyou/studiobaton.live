import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import { generateVersionForPost } from "@/lib/generate";
import { AVAILABLE_MODELS, DEFAULT_MODEL, AIModel } from "@/lib/ai";
import { VersionTone } from "@/app/generated/prisma";
import prisma from "@/lib/prisma";

interface SkippedPost {
  postId: string;
  date?: string;
  reason: "not_found" | "no_commits" | "already_exists" | "error";
}

interface ProcessedPost {
  postId: string;
  date?: string;
  versionId?: string;
}

interface ProgressEvent {
  type: "progress" | "complete" | "error";
  data: {
    current?: number;
    total?: number;
    currentDate?: string;
    status?: string;
    results?: ProcessedPost[];
    skippedDays?: SkippedPost[];
    processedDays?: number;
    error?: string;
    errorDetails?: {
      code: string;
      message: string;
      suggestion?: string;
    };
  };
}

function createSSEMessage(event: ProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

const VALID_TONES: VersionTone[] = ["PROFESSIONAL", "CASUAL", "TECHNICAL"];

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

  const body = await request.json();
  const {
    postIds,
    tone = "PROFESSIONAL",
    model = DEFAULT_MODEL,
    forceRegenerate = false,
  } = body;

  if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: "postIds 배열이 필요합니다." },
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  if (!VALID_TONES.includes(tone)) {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: `유효하지 않은 톤입니다. 허용 값: ${VALID_TONES.join(", ")}` },
      }),
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream" },
      }
    );
  }

  if (model && !(model in AVAILABLE_MODELS)) {
    return new Response(
      createSSEMessage({
        type: "error",
        data: { error: `유효하지 않은 모델입니다. 허용 값: ${Object.keys(AVAILABLE_MODELS).join(", ")}` },
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
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(createSSEMessage(event)));
      };

      try {
        const skippedDays: SkippedPost[] = [];
        const results: ProcessedPost[] = [];
        const total = postIds.length;

        for (let i = 0; i < postIds.length; i++) {
          const postId = postIds[i];
          const current = i + 1;

          // Post 정보 조회 (날짜 표시용)
          const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { targetDate: true },
          });

          const dateStr = post?.targetDate
            ? post.targetDate.toISOString().split("T")[0]
            : undefined;

          send({
            type: "progress",
            data: {
              current,
              total,
              currentDate: dateStr,
              status: "generating",
            },
          });

          try {
            const result = await generateVersionForPost(
              postId,
              tone as VersionTone,
              forceRegenerate,
              model as AIModel
            );

            if (!result.success) {
              if (result.error?.includes("찾을 수 없습니다")) {
                skippedDays.push({ postId, date: dateStr, reason: "not_found" });
              } else if (result.error?.includes("커밋이 없습니다")) {
                skippedDays.push({ postId, date: dateStr, reason: "no_commits" });
              } else if (result.error?.includes("이미 존재합니다")) {
                skippedDays.push({ postId, date: dateStr, reason: "already_exists" });
              } else {
                skippedDays.push({ postId, date: dateStr, reason: "error" });
              }
              continue;
            }

            results.push({
              postId,
              date: dateStr,
              versionId: result.versionId,
            });
          } catch (error) {
            console.error(`Error generating version for post ${postId}:`, error);
            skippedDays.push({ postId, date: dateStr, reason: "error" });
          }
        }

        send({
          type: "complete",
          data: {
            current: total,
            total,
            processedDays: results.length,
            results,
            skippedDays,
          },
        });
      } catch (error) {
        console.error("Batch version generate stream error:", error);
        send({
          type: "error",
          data: { error: "배치 버전 생성 중 오류가 발생했습니다." },
        });
      } finally {
        controller.close();
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
