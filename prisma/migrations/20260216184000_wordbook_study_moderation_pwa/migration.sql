-- Wordbook personal study state, report/block moderation, sentence fields

CREATE TYPE "WordbookStudyStatus" AS ENUM ('NEW', 'CORRECT', 'WRONG');
CREATE TYPE "WordbookReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

ALTER TABLE "Wordbook" ADD COLUMN "hiddenByAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "WordbookItem" ADD COLUMN "example" TEXT;
ALTER TABLE "WordbookItem" ADD COLUMN "exampleMeaning" TEXT;

CREATE TABLE "WordbookStudyState" (
  "userId" INTEGER NOT NULL,
  "wordbookId" INTEGER NOT NULL,
  "studiedCount" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "wrongCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WordbookStudyState_pkey" PRIMARY KEY ("userId", "wordbookId")
);

CREATE TABLE "WordbookStudyItemState" (
  "userId" INTEGER NOT NULL,
  "wordbookId" INTEGER NOT NULL,
  "itemId" INTEGER NOT NULL,
  "status" "WordbookStudyStatus" NOT NULL DEFAULT 'NEW',
  "streak" INTEGER NOT NULL DEFAULT 0,
  "lastResult" "LastResult",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WordbookStudyItemState_pkey" PRIMARY KEY ("userId", "wordbookId", "itemId")
);

CREATE TABLE "BlockedOwner" (
  "userId" INTEGER NOT NULL,
  "ownerId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlockedOwner_pkey" PRIMARY KEY ("userId", "ownerId")
);

CREATE TABLE "WordbookReport" (
  "id" SERIAL NOT NULL,
  "wordbookId" INTEGER NOT NULL,
  "reporterId" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "detail" TEXT,
  "status" "WordbookReportStatus" NOT NULL DEFAULT 'OPEN',
  "moderatorNote" TEXT,
  "reviewedById" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WordbookReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WordbookStudyState_wordbookId_idx" ON "WordbookStudyState"("wordbookId");
CREATE INDEX "WordbookStudyItemState_wordbookId_itemId_idx" ON "WordbookStudyItemState"("wordbookId", "itemId");
CREATE INDEX "WordbookStudyItemState_userId_itemId_idx" ON "WordbookStudyItemState"("userId", "itemId");
CREATE INDEX "BlockedOwner_ownerId_idx" ON "BlockedOwner"("ownerId");
CREATE INDEX "WordbookReport_wordbookId_status_createdAt_idx" ON "WordbookReport"("wordbookId", "status", "createdAt");
CREATE INDEX "WordbookReport_reporterId_createdAt_idx" ON "WordbookReport"("reporterId", "createdAt");

ALTER TABLE "WordbookStudyState" ADD CONSTRAINT "WordbookStudyState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordbookStudyState" ADD CONSTRAINT "WordbookStudyState_wordbookId_fkey" FOREIGN KEY ("wordbookId") REFERENCES "Wordbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WordbookStudyItemState" ADD CONSTRAINT "WordbookStudyItemState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordbookStudyItemState" ADD CONSTRAINT "WordbookStudyItemState_wordbookId_fkey" FOREIGN KEY ("wordbookId") REFERENCES "Wordbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordbookStudyItemState" ADD CONSTRAINT "WordbookStudyItemState_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "WordbookItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordbookStudyItemState" ADD CONSTRAINT "WordbookStudyItemState_userId_wordbookId_fkey" FOREIGN KEY ("userId", "wordbookId") REFERENCES "WordbookStudyState"("userId", "wordbookId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BlockedOwner" ADD CONSTRAINT "BlockedOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockedOwner" ADD CONSTRAINT "BlockedOwner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WordbookReport" ADD CONSTRAINT "WordbookReport_wordbookId_fkey" FOREIGN KEY ("wordbookId") REFERENCES "Wordbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordbookReport" ADD CONSTRAINT "WordbookReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordbookReport" ADD CONSTRAINT "WordbookReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
