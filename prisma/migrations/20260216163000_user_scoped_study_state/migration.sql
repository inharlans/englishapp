-- Make study state user-scoped: Progress/ResultState/QuizProgress -> (userId, wordId)

DO $$
DECLARE first_user_id INTEGER;
BEGIN
  SELECT "id" INTO first_user_id FROM "User" ORDER BY "id" ASC LIMIT 1;

  ALTER TABLE "Progress" ADD COLUMN "userId" INTEGER;
  IF first_user_id IS NOT NULL THEN
    UPDATE "Progress" SET "userId" = first_user_id WHERE "userId" IS NULL;
  END IF;
  DELETE FROM "Progress" WHERE "userId" IS NULL;
  ALTER TABLE "Progress" ALTER COLUMN "userId" SET NOT NULL;
  ALTER TABLE "Progress" DROP CONSTRAINT "Progress_pkey";
  ALTER TABLE "Progress" ADD CONSTRAINT "Progress_pkey" PRIMARY KEY ("userId", "wordId");
  ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

  ALTER TABLE "ResultState" ADD COLUMN "userId" INTEGER;
  IF first_user_id IS NOT NULL THEN
    UPDATE "ResultState" SET "userId" = first_user_id WHERE "userId" IS NULL;
  END IF;
  DELETE FROM "ResultState" WHERE "userId" IS NULL;
  ALTER TABLE "ResultState" ALTER COLUMN "userId" SET NOT NULL;
  ALTER TABLE "ResultState" DROP CONSTRAINT "ResultState_pkey";
  ALTER TABLE "ResultState" ADD CONSTRAINT "ResultState_pkey" PRIMARY KEY ("userId", "wordId");
  ALTER TABLE "ResultState" ADD CONSTRAINT "ResultState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

  ALTER TABLE "QuizProgress" ADD COLUMN "userId" INTEGER;
  IF first_user_id IS NOT NULL THEN
    UPDATE "QuizProgress" SET "userId" = first_user_id WHERE "userId" IS NULL;
  END IF;
  DELETE FROM "QuizProgress" WHERE "userId" IS NULL;
  ALTER TABLE "QuizProgress" ALTER COLUMN "userId" SET NOT NULL;
  ALTER TABLE "QuizProgress" DROP CONSTRAINT "QuizProgress_pkey";
  ALTER TABLE "QuizProgress" ADD CONSTRAINT "QuizProgress_pkey" PRIMARY KEY ("userId", "wordId");
  ALTER TABLE "QuizProgress" ADD CONSTRAINT "QuizProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END $$;

CREATE INDEX "Progress_wordId_idx" ON "Progress"("wordId");
CREATE INDEX "ResultState_wordId_idx" ON "ResultState"("wordId");
CREATE INDEX "QuizProgress_wordId_idx" ON "QuizProgress"("wordId");
