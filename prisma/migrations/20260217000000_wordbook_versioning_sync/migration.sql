-- Add versioning fields for wordbook sync UX
ALTER TABLE "Wordbook"
  ADD COLUMN "contentVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "WordbookDownload"
  ADD COLUMN "downloadedVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "snapshotItemCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "WordbookDownload" d
SET "downloadedVersion" = COALESCE(
      (SELECT w."contentVersion" FROM "Wordbook" w WHERE w."id" = d."wordbookId"),
      1
    ),
    "snapshotItemCount" = COALESCE(
      (SELECT COUNT(*)::int FROM "WordbookItem" wi WHERE wi."wordbookId" = d."wordbookId"),
      0
    ),
    "syncedAt" = d."createdAt";

CREATE TABLE "WordbookVersionLog" (
  "id" SERIAL NOT NULL,
  "wordbookId" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "addedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "deletedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WordbookVersionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WordbookVersionLog_wordbookId_version_idx" ON "WordbookVersionLog"("wordbookId", "version");
CREATE INDEX "WordbookVersionLog_wordbookId_createdAt_idx" ON "WordbookVersionLog"("wordbookId", "createdAt");

ALTER TABLE "WordbookVersionLog"
  ADD CONSTRAINT "WordbookVersionLog_wordbookId_fkey"
  FOREIGN KEY ("wordbookId") REFERENCES "Wordbook"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

