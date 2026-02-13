-- CreateTable
CREATE TABLE "Word" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "en" TEXT NOT NULL,
    "ko" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Progress" (
    "wordId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" DATETIME,
    "wrongActive" BOOLEAN NOT NULL DEFAULT false,
    "wrongRecoveryRemaining" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Progress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResultState" (
    "wordId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "everCorrect" BOOLEAN NOT NULL DEFAULT false,
    "everWrong" BOOLEAN NOT NULL DEFAULT false,
    "lastResult" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResultState_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Word_en_key" ON "Word"("en");
