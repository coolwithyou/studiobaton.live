import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";
import { format, parseISO, eachDayOfInterval } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionData();

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "startDate와 endDate 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const startDate = parseISO(startDateParam);
    const endDate = parseISO(endDateParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요." },
        { status: 400 }
      );
    }

    // 날짜 범위 내의 모든 날짜 생성
    const dates = eachDayOfInterval({ start: startDate, end: endDate });

    // DB에서 해당 기간의 커밋 수 조회 (날짜별 그룹화)
    const commitStats = await prisma.commitLog.groupBy({
      by: ["committedAt"],
      where: {
        committedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // 날짜별 커밋 수 맵 생성
    const commitCountByDate = new Map<string, number>();
    for (const stat of commitStats) {
      const dateKey = format(new Date(stat.committedAt), "yyyy-MM-dd");
      const currentCount = commitCountByDate.get(dateKey) || 0;
      commitCountByDate.set(dateKey, currentCount + stat._count.id);
    }

    // 해당 기간의 Post 조회
    const posts = await prisma.post.findMany({
      where: {
        targetDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        targetDate: true,
        status: true,
        _count: {
          select: {
            commits: true,
          },
        },
      },
    });

    // Post 정보를 날짜별 맵으로 변환
    const postByDate = new Map<
      string,
      { status: string; commitCount: number }
    >();
    for (const post of posts) {
      const dateKey = format(new Date(post.targetDate), "yyyy-MM-dd");
      postByDate.set(dateKey, {
        status: post.status,
        commitCount: post._count.commits,
      });
    }

    // 결과 생성
    const stats = dates.map((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const postInfo = postByDate.get(dateKey);

      return {
        date: dateKey,
        commitCount: postInfo?.commitCount || commitCountByDate.get(dateKey) || 0,
        hasPost: !!postInfo,
        postStatus: postInfo?.status || null,
      };
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Fetch commit stats error:", error);
    return NextResponse.json(
      { error: "커밋 통계를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
