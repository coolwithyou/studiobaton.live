import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { generatePostForDate } from "@/lib/generate";
import { parseISO } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionData();

    if (!session.isLoggedIn) {
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

    // 미래 날짜는 처리하지 않음
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (targetDate > today) {
      return NextResponse.json(
        { error: "미래 날짜는 처리할 수 없습니다." },
        { status: 400 }
      );
    }

    const result = await generatePostForDate(targetDate, forceRegenerate);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate post error:", error);
    return NextResponse.json(
      { error: "포스트 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
