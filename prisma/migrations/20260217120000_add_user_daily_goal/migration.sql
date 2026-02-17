ALTER TABLE "User"
ADD COLUMN "dailyGoal" INTEGER NOT NULL DEFAULT 30;

CREATE INDEX "WordbookStudyItemState_userId_lastResult_updatedAt_idx"
ON "WordbookStudyItemState" ("userId", "lastResult", "updatedAt");
