ALTER TABLE "WordbookStudyItemState"
  ADD COLUMN "everCorrect" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "everWrong" BOOLEAN NOT NULL DEFAULT false;
