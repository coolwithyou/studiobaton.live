/**
 * 캐리오버 쿼리 디버깅 스크립트
 *
 * 실행: npx tsx scripts/debug-carryover.ts
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { TZDate } from "@date-fns/tz";
import { subDays as fnsSubDays, parseISO } from "date-fns";

const KST_TIMEZONE = "Asia/Seoul";

function toKST(date: Date | string): TZDate {
  const d = typeof date === "string" ? parseISO(date) : date;
  return new TZDate(d, KST_TIMEZONE);
}

// PostgreSQL DATE 컬럼 쿼리용 UTC Date 변환
function toDateOnlyUTC(date: Date | string): Date {
  const kstDate = toKST(date);
  const year = kstDate.getFullYear();
  const month = kstDate.getMonth();
  const day = kstDate.getDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

function subDaysKST(date: Date | string, amount: number): Date {
  const kstDate = toKST(date);
  return fnsSubDays(kstDate, amount);
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // 1월 21일 기준으로 테스트
  const testDate = "2026-01-21";
  const memberId = "cm5o81m7g0001ffx1t6kqedg3"; // 첫 번째 멤버 ID 사용

  console.log("=== 캐리오버 쿼리 디버깅 ===\n");

  // 멤버 확인
  const members = await prisma.member.findMany({ take: 1 });
  const actualMemberId = members[0]?.id;
  console.log("실제 멤버 ID:", actualMemberId);

  // 날짜 계산 (toDateOnlyUTC 사용)
  const targetDate = toDateOnlyUTC(testDate);
  const carryoverDays = 7;
  const carryoverStartDate = toDateOnlyUTC(subDaysKST(testDate, carryoverDays));

  console.log("\n📅 날짜 정보:");
  console.log("  테스트 날짜:", testDate);
  console.log("  targetDate:", targetDate.toISOString());
  console.log("  carryoverStartDate:", carryoverStartDate.toISOString());
  console.log("  carryoverDays:", carryoverDays);

  // 모든 미완료 태스크 조회
  console.log("\n📋 모든 미완료 태스크:");
  const incompleteTasks = await prisma.standupTask.findMany({
    where: {
      isCompleted: false,
    },
    include: { standup: true },
  });

  for (const task of incompleteTasks) {
    console.log({
      id: task.id.slice(0, 8),
      content: task.content.slice(0, 40),
      dueDate: task.dueDate?.toISOString(),
      memberId: task.standup.memberId.slice(0, 8),
      isInRange:
        task.dueDate &&
        task.dueDate >= carryoverStartDate &&
        task.dueDate < targetDate,
    });
  }

  // 실제 캐리오버 쿼리 실행
  console.log("\n🔍 캐리오버 쿼리 결과:");
  if (actualMemberId) {
    const carriedOverTasks = await prisma.standupTask.findMany({
      where: {
        standup: { memberId: actualMemberId },
        isCompleted: false,
        dueDate: {
          gte: carryoverStartDate,
          lt: targetDate,
        },
      },
      orderBy: [{ dueDate: "asc" }, { displayOrder: "asc" }],
    });

    console.log(`  결과 개수: ${carriedOverTasks.length}`);
    for (const task of carriedOverTasks) {
      console.log({
        id: task.id.slice(0, 8),
        content: task.content.slice(0, 40),
        dueDate: task.dueDate?.toISOString(),
      });
    }
  }

  // 1월 20일 태스크의 dueDate 직접 비교
  console.log("\n🔬 1월 20일 태스크 분석:");
  const jan20Tasks = await prisma.standupTask.findMany({
    where: {
      standup: {
        date: new Date("2026-01-20"),
      },
    },
    include: { standup: true },
  });

  for (const task of jan20Tasks) {
    const dueDate = task.dueDate;
    console.log({
      content: task.content.slice(0, 40),
      dueDate: dueDate?.toISOString(),
      targetDate: targetDate.toISOString(),
      carryoverStartDate: carryoverStartDate.toISOString(),
      "dueDate >= carryoverStartDate": dueDate ? dueDate >= carryoverStartDate : "N/A",
      "dueDate < targetDate": dueDate ? dueDate < targetDate : "N/A",
      isCompleted: task.isCompleted,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
