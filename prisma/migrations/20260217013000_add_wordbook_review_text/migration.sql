ALTER TABLE "WordbookRating"
ADD COLUMN "review" TEXT;

CREATE INDEX "WordbookRating_wordbookId_updatedAt_idx"
ON "WordbookRating"("wordbookId", "updatedAt");
