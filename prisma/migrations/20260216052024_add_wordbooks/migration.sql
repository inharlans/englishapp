-- CreateTable
CREATE TABLE "Wordbook" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fromLang" TEXT NOT NULL DEFAULT 'en',
    "toLang" TEXT NOT NULL DEFAULT 'ko',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wordbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordbookItem" (
    "id" SERIAL NOT NULL,
    "wordbookId" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "pronunciation" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordbookItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordbookDownload" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "wordbookId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordbookDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordbookRating" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "wordbookId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordbookRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Wordbook_ownerId_createdAt_idx" ON "Wordbook"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Wordbook_isPublic_ratingAvg_downloadCount_createdAt_idx" ON "Wordbook"("isPublic", "ratingAvg", "downloadCount", "createdAt");

-- CreateIndex
CREATE INDEX "WordbookItem_wordbookId_position_idx" ON "WordbookItem"("wordbookId", "position");

-- CreateIndex
CREATE INDEX "WordbookDownload_wordbookId_idx" ON "WordbookDownload"("wordbookId");

-- CreateIndex
CREATE UNIQUE INDEX "WordbookDownload_userId_wordbookId_key" ON "WordbookDownload"("userId", "wordbookId");

-- CreateIndex
CREATE INDEX "WordbookRating_wordbookId_rating_idx" ON "WordbookRating"("wordbookId", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "WordbookRating_userId_wordbookId_key" ON "WordbookRating"("userId", "wordbookId");

-- AddForeignKey
ALTER TABLE "Wordbook" ADD CONSTRAINT "Wordbook_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordbookItem" ADD CONSTRAINT "WordbookItem_wordbookId_fkey" FOREIGN KEY ("wordbookId") REFERENCES "Wordbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordbookDownload" ADD CONSTRAINT "WordbookDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordbookDownload" ADD CONSTRAINT "WordbookDownload_wordbookId_fkey" FOREIGN KEY ("wordbookId") REFERENCES "Wordbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordbookRating" ADD CONSTRAINT "WordbookRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordbookRating" ADD CONSTRAINT "WordbookRating_wordbookId_fkey" FOREIGN KEY ("wordbookId") REFERENCES "Wordbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
