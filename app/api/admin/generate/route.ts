import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import { generatePostForDate } from "@/lib/generate";
import { parseISO } from "date-fns";
import { endOfDayKST } from "@/lib/date-utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, forceRegenerate = false } = body;

    if (!date) {
      return NextResponse.json(
        { error: "date 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const targetDate = parseISO(date);

    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요." },
        { status: 400 }
      );
    }

    // 미래 날짜는 처리하지 않음 (KST 기준)
    const todayEnd = endOfDayKST();
    if (targetDate > todayEnd) {
      return NextResponse.json(
        { error: "미래 날짜는 처리할 수 없습니다." },
        { status: 400 }
      );
    }

    const result = await generatePostForDate(targetDate, forceRegenerate);

    // 실패 시에도 상세 에러 정보와 함께 반환 (200 응답)
    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate post error:", error);

    // 에러 상세 정보 추출
    let errorDetails = undefined;
    let errorMessage = "포스트 생성 중 오류가 발생했습니다.";

    if (error && typeof error === "object") {
      if ("details" in error) {
        // AIError인 경우
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
        commitsCollected: 0,
        versionsGenerated: 0,
      },
      { status: 500 }
    );
  }
}
