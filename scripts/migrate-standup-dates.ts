/**
 * 기존 StandupTask 데이터에 dueDate와 originalDueDate를 설정하는 마이그레이션 스크립트
 *
 * 실행: npx tsx scripts/migrate-standup-dates.ts
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔍 Checking StandupTask records...\n");

  // 모든 StandupTask와 연결된 Standup 조회
  const tasks = await prisma.standupTask.findMany({
    include: { standup: true },
  });

  console.log(`Found ${tasks.length} total StandupTask records.\n`);

  // dueDate가 null인 레코드 찾기
  const tasksNeedingUpdate = tasks.filter(
    (t) => t.dueDate === null || t.originalDueDate === null
  );

  console.log(`Tasks needing update: ${tasksNeedingUpdate.length}\n`);

  if (tasksNeedingUpdate.length === 0) {
    console.log("✅ All tasks already have dueDate and originalDueDate set.");

    // 현재 상태 출력
    console.log("\n📊 Current data status:");
    for (const task of tasks.slice(0, 5)) {
      console.log({
        id: task.id.slice(0, 8),
        content: task.content.slice(0, 40),
        dueDate: task.dueDate?.toISOString(),
        originalDueDate: task.originalDueDate?.toISOString(),
        standupDate: task.standup.date.toISOString(),
        isCompleted: task.isCompleted,
      });
    }
    return;
  }

  console.log("🔄 Updating tasks...\n");

  for (const task of tasksNeedingUpdate) {
    const standupDate = task.standup.date;

    await prisma.standupTask.update({
      where: { id: task.id },
      data: {
        dueDate: task.dueDate ?? standupDate,
        originalDueDate: task.originalDueDate ?? standupDate,
      },
    });

    console.log(
      `  Updated task ${task.id.slice(0, 8)}: dueDate=${standupDate.toISOString()}`
    );
  }

  console.log(`\n✅ Updated ${tasksNeedingUpdate.length} tasks.`);
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
