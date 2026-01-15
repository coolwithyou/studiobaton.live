-- CreateTable
CREATE TABLE "Standup" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Standup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandupTask" (
    "id" TEXT NOT NULL,
    "standupId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "repository" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandupTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Standup_date_idx" ON "Standup"("date");

-- CreateIndex
CREATE INDEX "Standup_memberId_idx" ON "Standup"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Standup_memberId_date_key" ON "Standup"("memberId", "date");

-- CreateIndex
CREATE INDEX "StandupTask_standupId_idx" ON "StandupTask"("standupId");

-- AddForeignKey
ALTER TABLE "Standup" ADD CONSTRAINT "Standup_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupTask" ADD CONSTRAINT "StandupTask_standupId_fkey" FOREIGN KEY ("standupId") REFERENCES "Standup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
