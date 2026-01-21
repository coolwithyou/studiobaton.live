import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-helpers";

// POST: 이메일 기반 Admin-Member 자동 매칭
export async function POST() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 연결되지 않은 Admin 목록 조회
    const unlinkedAdmins = await prisma.admin.findMany({
      where: { linkedMemberId: null },
      select: { id: true, email: true, name: true },
    });

    // 연결되지 않은 Member 목록 조회
    const unlinkedMembers = await prisma.member.findMany({
      where: { linkedAdmin: null },
      select: { id: true, email: true, name: true },
    });

    // 이메일로 매칭
    const matches: { adminId: string; memberId: string; email: string }[] = [];

    for (const admin of unlinkedAdmins) {
      if (!admin.email) continue;

      const matchedMember = unlinkedMembers.find(
        (member) => member.email?.toLowerCase() === admin.email?.toLowerCase()
      );

      if (matchedMember) {
        matches.push({
          adminId: admin.id,
          memberId: matchedMember.id,
          email: admin.email,
        });
      }
    }

    // 매칭된 쌍을 DB에 반영
    const results = await Promise.all(
      matches.map(async (match) => {
        try {
          await prisma.admin.update({
            where: { id: match.adminId },
            data: { linkedMemberId: match.memberId },
          });
          return { success: true, email: match.email };
        } catch (error) {
          console.error(`Failed to link ${match.email}:`, error);
          return { success: false, email: match.email };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `${successCount}개의 계정이 매칭되었습니다.`,
      matched: successCount,
      failed: failCount,
      details: results,
    });
  } catch (error) {
    console.error("Failed to match members:", error);
    return NextResponse.json(
      { error: "Failed to match members" },
      { status: 500 }
    );
  }
}
