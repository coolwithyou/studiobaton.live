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
  const adminEmail = process.env.ADMIN_EMAIL || "admin@studiobaton.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.admin.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "Admin",
      },
    });

    console.log(`✅ Admin account created: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ⚠️  Please change the password after first login!`);
  } else {
    console.log(`ℹ️  Admin account already exists: ${adminEmail}`);
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
