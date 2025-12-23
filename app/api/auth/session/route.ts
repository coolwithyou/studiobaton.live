import { NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionData();

    return NextResponse.json({
      isLoggedIn: session.isLoggedIn,
      admin: session.isLoggedIn
        ? {
            id: session.adminId,
            email: session.email,
            name: session.name,
          }
        : null,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "세션 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
