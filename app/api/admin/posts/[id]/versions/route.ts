import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import { generateVersionForPost } from "@/lib/generate";
import { VersionTone } from "@/app/generated/prisma";

const VALID_TONES: VersionTone[] = ["PROFESSIONAL", "CASUAL", "TECHNICAL"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;
    const body = await request.json();
    const { tone = "PROFESSIONAL", forceRegenerate = false } = body;

    if (!VALID_TONES.includes(tone)) {
      return NextResponse.json(
        { error: `유효하지 않은 톤입니다. 허용 값: ${VALID_TONES.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await generateVersionForPost(postId, tone as VersionTone, forceRegenerate);

    if (!result.success) {
      return NextResponse.json(result, { status: result.errorDetails ? 500 : 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate version error:", error);

    let errorDetails = undefined;
    let errorMessage = "버전 생성 중 오류가 발생했습니다.";

    if (error && typeof error === "object") {
      if ("details" in error) {
        const aiError = error as { details: { code: string; message: string; status?: number; type?: string; suggestion?: string; requestId?: string } };
        errorDetails = aiError.details;
        errorMessage = aiError.details.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = {
          code: "UNKNOWN_ERROR",
          message: error.message,
          suggestion: "관리자에게 문의해주세요.",
        };
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorDetails,
      },
      { status: 500 }
    );
  }
}
