import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helpers";
import { getHolidaysForYear } from "@/lib/holidays";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");

    if (!yearParam) {
      return NextResponse.json(
        { error: "year 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam);

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "유효하지 않은 연도입니다." },
        { status: 400 }
      );
    }

    const holidays = await getHolidaysForYear(year);

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error("Fetch holidays error:", error);
    return NextResponse.json(
      { error: "공휴일 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
