import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // 기본 관리자 계정 생성
  // 주의: @ba-ton.kr 이메일만 로그인 가능
  const adminEmail = process.env.ADMIN_EMAIL || "admin@ba-ton.kr";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
  const adminName = process.env.ADMIN_NAME || "관리자";

  // 이메일 도메인 검증
  if (!adminEmail.endsWith("@ba-ton.kr")) {
    console.error("❌ 오류: @ba-ton.kr 이메일만 사용할 수 있습니다.");
    console.error("   ADMIN_EMAIL 환경변수를 확인해주세요.");
    process.exit(1);
  }

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.admin.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
      },
    });

    console.log(`✅ 관리자 계정 생성 완료: ${adminEmail}`);
    console.log(`   비밀번호: ${adminPassword}`);
    console.log(`   ⚠️  첫 로그인 후 반드시 비밀번호를 변경하세요!`);
  } else {
    console.log(`ℹ️  관리자 계정이 이미 존재합니다: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
