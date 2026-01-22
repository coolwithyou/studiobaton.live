/**
 * COMMIT_BASED 포스트를 "log" ContentType에 연결하는 마이그레이션 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/migrate-posts-to-content-type.ts
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🔄 COMMIT_BASED 포스트를 'log' ContentType에 연결합니다...");
  console.log("");

  // 1. "log" ContentType 확인 또는 생성
  let logContentType = await prisma.contentType.findUnique({
    where: { slug: "log" },
  });

  if (!logContentType) {
    console.log("📝 'log' ContentType이 없습니다. 새로 생성합니다...");
    logContentType = await prisma.contentType.create({
      data: {
        slug: "log",
        pluralSlug: "logs",
        displayName: "개발 로그",
        description: "일일 개발 활동 기록",
        displayOrder: 1,
      },
    });
    console.log(`✅ 'log' ContentType 생성 완료 (id: ${logContentType.id})`);
  } else {
    console.log(`ℹ️  'log' ContentType이 이미 존재합니다 (id: ${logContentType.id})`);
  }

  // 2. COMMIT_BASED 포스트 중 contentTypeId가 없는 것들 조회
  const postsToMigrate = await prisma.post.findMany({
    where: {
      type: "COMMIT_BASED",
      contentTypeId: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  console.log("");
  console.log(`📊 마이그레이션 대상: ${postsToMigrate.length}개 포스트`);

  if (postsToMigrate.length === 0) {
    console.log("✅ 마이그레이션할 포스트가 없습니다.");
    return;
  }

  // 3. 일괄 업데이트
  const result = await prisma.post.updateMany({
    where: {
      type: "COMMIT_BASED",
      contentTypeId: null,
    },
    data: {
      contentTypeId: logContentType.id,
    },
  });

  console.log(`✅ ${result.count}개 포스트가 'log' ContentType에 연결되었습니다.`);
  console.log("");
  console.log("📋 마이그레이션된 포스트:");
  for (const post of postsToMigrate.slice(0, 10)) {
    console.log(`   - ${post.title || post.slug || post.id}`);
  }
  if (postsToMigrate.length > 10) {
    console.log(`   ... 외 ${postsToMigrate.length - 10}개`);
  }

  console.log("");
  console.log("🎉 마이그레이션 완료!");
  console.log("");
  console.log("📌 URL 변경 안내:");
  console.log("   - 기존: /log/{slug}");
  console.log("   - 변경: /logs/{slug}");
  console.log("   - /log/{slug}로 접근 시 자동으로 /logs/{slug}로 리다이렉트됩니다.");
}

main()
  .catch((e) => {
    console.error("❌ 마이그레이션 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
