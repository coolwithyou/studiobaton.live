/**
 * 날짜 오프셋 수정 마이그레이션 스크립트
 *
 * 문제: 기존 startOfDayKST()가 KST 자정을 UTC로 변환하면서 -9시간 되어
 *       PostgreSQL DATE 컬럼에 하루 전 날짜로 저장됨
 *
 * 해결: 모든 DATE 컬럼에 1일을 더해서 원래 의도한 날짜로 복원
 *
 * 대상 테이블:
 * - Standup.date
 * - StandupTask.dueDate
 * - StandupTask.originalDueDate
 *
 * 실행: npx tsx scripts/fix-date-offset.ts
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔧 날짜 오프셋 수정 마이그레이션 시작...\n");

  // 1. 현재 상태 확인
  console.log("📊 현재 데이터 상태:");
  const standups = await prisma.standup.findMany({
    include: { tasks: true },
    orderBy: { date: "desc" },
  });

  console.log(`  - Standup 레코드: ${standups.length}개`);
  console.log(`  - StandupTask 레코드: ${standups.reduce((acc, s) => acc + s.tasks.length, 0)}개\n`);

  if (standups.length === 0) {
    console.log("⚠️  마이그레이션할 데이터가 없습니다.");
    return;
  }

  // 수정 전 샘플 출력
  console.log("📅 수정 전 샘플 (최신 5개):");
  for (const standup of standups.slice(0, 5)) {
    console.log(`  Standup: ${standup.date.toISOString().split("T")[0]} (memberId: ${standup.memberId.slice(0, 8)})`);
    for (const task of standup.tasks.slice(0, 2)) {
      console.log(`    - Task: dueDate=${task.dueDate?.toISOString().split("T")[0]}, content="${task.content.slice(0, 30)}..."`);
    }
  }

  console.log("\n⚠️  주의: 이 스크립트는 모든 날짜에 1일을 더합니다.");
  console.log("   예: 2026-01-20 → 2026-01-21\n");

  // 2. 트랜잭션 내에서 처리 (unique constraint 우회를 위해 개별 업데이트)
  console.log("🔄 Standup 레코드 수정 중 (역순으로)...");

  // 날짜 내림차순으로 정렬하여 가장 최신 날짜부터 업데이트 (충돌 방지)
  const sortedStandups = [...standups].sort((a, b) => b.date.getTime() - a.date.getTime());

  let standupUpdated = 0;
  for (const standup of sortedStandups) {
    const newDate = new Date(standup.date.getTime() + 24 * 60 * 60 * 1000);
    await prisma.standup.update({
      where: { id: standup.id },
      data: { date: newDate },
    });
    standupUpdated++;
  }
  console.log(`  ✅ ${standupUpdated}개 Standup 레코드 수정 완료`);

  // 3. StandupTask.dueDate, originalDueDate 수정
  console.log("🔄 StandupTask 레코드 수정 중...");

  const allTasks = await prisma.standupTask.findMany();

  let taskUpdated = 0;
  for (const task of allTasks) {
    const newDueDate = task.dueDate ? new Date(task.dueDate.getTime() + 24 * 60 * 60 * 1000) : undefined;
    const newOriginalDueDate = task.originalDueDate ? new Date(task.originalDueDate.getTime() + 24 * 60 * 60 * 1000) : undefined;

    await prisma.standupTask.update({
      where: { id: task.id },
      data: {
        dueDate: newDueDate,
        originalDueDate: newOriginalDueDate,
      },
    });
    taskUpdated++;
  }
  console.log(`  ✅ ${taskUpdated}개 StandupTask 레코드 수정 완료`);

  // 4. 수정 후 상태 확인
  console.log("\n📊 수정 후 데이터 상태:");
  const updatedStandups = await prisma.standup.findMany({
    include: { tasks: true },
    orderBy: { date: "desc" },
  });

  console.log("📅 수정 후 샘플 (최신 5개):");
  for (const standup of updatedStandups.slice(0, 5)) {
    console.log(`  Standup: ${standup.date.toISOString().split("T")[0]} (memberId: ${standup.memberId.slice(0, 8)})`);
    for (const task of standup.tasks.slice(0, 2)) {
      console.log(`    - Task: dueDate=${task.dueDate?.toISOString().split("T")[0]}, content="${task.content.slice(0, 30)}..."`);
    }
  }

  console.log("\n✅ 마이그레이션 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 마이그레이션 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
