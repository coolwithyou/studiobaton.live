-- CreateTable
CREATE TABLE "CommitFile" (
    "id" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "changes" INTEGER NOT NULL DEFAULT 0,
    "patch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommitFile_commitSha_idx" ON "CommitFile"("commitSha");

-- AddForeignKey
ALTER TABLE "CommitFile" ADD CONSTRAINT "CommitFile_commitSha_fkey" FOREIGN KEY ("commitSha") REFERENCES "CommitLog"("sha") ON DELETE CASCADE ON UPDATE CASCADE;
