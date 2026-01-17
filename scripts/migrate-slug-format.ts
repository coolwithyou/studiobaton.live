/**
 * 포스트 slug 형식 마이그레이션 스크립트
 * YYYY-MM-DD-slugPart -> YYYYMMDD-slugPart
 *
 * 실행: source .env && npx tsx scripts/migrate-slug-format.ts
 */

import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function migrateSlugFormat() {
  console.log("=== Slug 형식 마이그레이션 시작 ===\n");

  // 발행된 포스트 중 slug가 있는 것만 조회
  const posts = await prisma.post.findMany({
    where: {
      slug: { not: null },
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  console.log(`총 ${posts.length}개의 발행된 포스트 발견\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const post of posts) {
    const oldSlug = post.slug!;

    // YYYY-MM-DD-slugPart 패턴 검사 (예: 2025-01-17-my-post)
    const match = oldSlug.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);

    if (!match) {
      console.log(`[SKIP] "${oldSlug}" - 기존 형식이 아님`);
      skippedCount++;
      continue;
    }

    const [, year, month, day, slugPart] = match;
    const newSlug = `${year}${month}${day}-${slugPart}`;

    // 새 slug가 이미 존재하는지 확인
    const existing = await prisma.post.findFirst({
      where: {
        slug: newSlug,
        id: { not: post.id },
      },
    });

    if (existing) {
      console.log(`[ERROR] "${oldSlug}" -> "${newSlug}" - 중복 slug 존재`);
      continue;
    }

    // 업데이트
    await prisma.post.update({
      where: { id: post.id },
      data: { slug: newSlug },
    });

    console.log(`[OK] "${oldSlug}" -> "${newSlug}"`);
    updatedCount++;
  }

  console.log("\n=== 마이그레이션 완료 ===");
  console.log(`업데이트: ${updatedCount}개`);
  console.log(`스킵: ${skippedCount}개`);
}

migrateSlugFormat()
  .catch((error) => {
    console.error("마이그레이션 실패:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
