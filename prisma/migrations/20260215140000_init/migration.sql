-- CreateEnum
CREATE TYPE "LastResult" AS ENUM ('CORRECT', 'WRONG');

-- CreateTable
CREATE TABLE "Word" (
    "id" SERIAL NOT NULL,
    "en" TEXT NOT NULL,
    "ko" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "wordId" INTEGER NOT NULL,
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3),
    "wrongActive" BOOLEAN NOT NULL DEFAULT false,
    "wrongRecoveryRemaining" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Progress_pkey" PRIMARY KEY ("wordId")
);

-- CreateTable
CREATE TABLE "ResultState" (
    "wordId" INTEGER NOT NULL,
    "everCorrect" BOOLEAN NOT NULL DEFAULT false,
    "everWrong" BOOLEAN NOT NULL DEFAULT false,
    "lastResult" "LastResult",
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResultState_pkey" PRIMARY KEY ("wordId")
);

-- CreateTable
CREATE TABLE "QuizProgress" (
    "wordId" INTEGER NOT NULL,
    "meaningCorrectStreak" INTEGER NOT NULL DEFAULT 0,
    "meaningNextReviewAt" TIMESTAMP(3),
    "meaningLastResult" "LastResult",
    "wordCorrectStreak" INTEGER NOT NULL DEFAULT 0,
    "wordNextReviewAt" TIMESTAMP(3),
    "wordLastResult" "LastResult",
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuizProgress_pkey" PRIMARY KEY ("wordId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Word_en_key" ON "Word"("en");

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultState" ADD CONSTRAINT "ResultState_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizProgress" ADD CONSTRAINT "QuizProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
