ALTER TABLE "WordbookStudyState"
ADD COLUMN "meaningQuestionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "wordQuestionCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "WordbookStudyItemState"
ADD COLUMN "meaningCorrectStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "meaningNextReviewAt" TIMESTAMP(3),
ADD COLUMN "meaningWrongRequeueAt" INTEGER,
ADD COLUMN "wordCorrectStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "wordNextReviewAt" TIMESTAMP(3),
ADD COLUMN "wordWrongRequeueAt" INTEGER;

CREATE INDEX "WordbookStudyItemState_userId_wordbookId_meaningNextReviewAt_idx"
ON "WordbookStudyItemState" ("userId", "wordbookId", "meaningNextReviewAt");

CREATE INDEX "WordbookStudyItemState_userId_wordbookId_wordNextReviewAt_idx"
ON "WordbookStudyItemState" ("userId", "wordbookId", "wordNextReviewAt");

CREATE INDEX "WordbookStudyItemState_userId_wordbookId_meaningWrongRequeueAt_idx"
ON "WordbookStudyItemState" ("userId", "wordbookId", "meaningWrongRequeueAt");

CREATE INDEX "WordbookStudyItemState_userId_wordbookId_wordWrongRequeueAt_idx"
ON "WordbookStudyItemState" ("userId", "wordbookId", "wordWrongRequeueAt");
