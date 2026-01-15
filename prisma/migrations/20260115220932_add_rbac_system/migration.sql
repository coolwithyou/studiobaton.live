-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEAM_MEMBER', 'ORG_MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ORG_MEMBER',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

-- 기존 @ba-ton.kr 사용자들을 ADMIN/ACTIVE로 설정
UPDATE "Admin"
SET "role" = 'ADMIN',
    "status" = 'ACTIVE',
    "approvedAt" = NOW()
WHERE "email" LIKE '%@ba-ton.kr';
