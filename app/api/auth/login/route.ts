import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifyPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 내부 이메일 도메인 제한
    if (!email.endsWith("@ba-ton.kr")) {
      return NextResponse.json(
        { error: "내부 이메일(@ba-ton.kr)만 로그인할 수 있습니다." },
        { status: 403 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, admin.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.adminId = admin.id;
    session.email = admin.email;
    session.name = admin.name ?? undefined;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "로그인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
