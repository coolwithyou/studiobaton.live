import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("📋 Google OAuth 로그인 시스템을 사용합니다.");
  console.log("");
  console.log("✅ 로그인 방법:");
  console.log("   1. http://localhost:3000/console 접속");
  console.log("   2. 'Google로 로그인' 버튼 클릭");
  console.log("   3. @ba-ton.kr 계정으로 로그인");
  console.log("");
  console.log("⚠️  주의사항:");
  console.log("   - @ba-ton.kr 도메인 계정만 로그인 가능합니다.");
  console.log("   - 최초 로그인 시 자동으로 Admin 계정이 생성됩니다.");
  console.log("");

  // 선택적: 테스트용 Admin 레코드 생성 (emailVerified만 설정)
  const testEmail = process.env.TEST_ADMIN_EMAIL;

  if (testEmail) {
    if (!testEmail.endsWith("@ba-ton.kr")) {
      console.error("❌ 오류: TEST_ADMIN_EMAIL은 @ba-ton.kr 도메인이어야 합니다.");
      process.exit(1);
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { email: testEmail },
    });

    if (!existingAdmin) {
      await prisma.admin.create({
        data: {
          email: testEmail,
          name: process.env.TEST_ADMIN_NAME || "테스트 관리자",
          emailVerified: new Date(),
        },
      });
      console.log(`✅ 테스트 Admin 레코드 생성 완료: ${testEmail}`);
      console.log("   (Google OAuth로 로그인해야 Account가 연결됩니다)");
    } else {
      console.log(`ℹ️  Admin 계정이 이미 존재합니다: ${testEmail}`);
    }
  }

  // 팀원 데이터 시드
  console.log("");
  console.log("👥 팀원 데이터를 생성합니다...");

  const members = [
    {
      name: "팀원 1",
      githubName: "member1",
      email: "member1@example.com", // 실제 GitHub 커밋 이메일로 변경 필요
      displayOrder: 1,
    },
    {
      name: "팀원 2",
      githubName: "member2",
      email: "member2@example.com", // 실제 GitHub 커밋 이메일로 변경 필요
      displayOrder: 2,
    },
    {
      name: "팀원 3",
      githubName: "member3",
      email: "member3@example.com", // 실제 GitHub 커밋 이메일로 변경 필요
      displayOrder: 3,
    },
  ];

  for (const member of members) {
    const existing = await prisma.member.findUnique({
      where: { email: member.email },
    });

    if (!existing) {
      await prisma.member.create({ data: member });
      console.log(`✅ 팀원 생성: ${member.name} (${member.email})`);
    } else {
      console.log(`ℹ️  팀원이 이미 존재합니다: ${member.name}`);
    }
  }

  console.log("");
  console.log("⚠️  중요: 팀원 이메일을 실제 GitHub 커밋 이메일로 업데이트해주세요!");
  console.log("   - /console/members 페이지에서 수정 가능합니다.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
