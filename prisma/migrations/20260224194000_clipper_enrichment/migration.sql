CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PHRASE', 'OTHER', 'UNKNOWN');
CREATE TYPE "ExampleSource" AS ENUM ('SOURCE', 'AI', 'NONE');
CREATE TYPE "EnrichmentStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

ALTER TABLE "User"
ADD COLUMN "defaultWordbookId" INTEGER;

ALTER TABLE "WordbookItem"
ADD COLUMN "meaningKo" TEXT,
ADD COLUMN "normalizedTerm" TEXT,
ADD COLUMN "partOfSpeech" "PartOfSpeech",
ADD COLUMN "exampleSentenceEn" TEXT,
ADD COLUMN "exampleSentenceKo" TEXT,
ADD COLUMN "exampleSource" "ExampleSource" NOT NULL DEFAULT 'NONE',
ADD COLUMN "enrichmentStatus" "EnrichmentStatus" NOT NULL DEFAULT 'DONE',
ADD COLUMN "enrichmentError" TEXT,
ADD COLUMN "enrichmentQueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "enrichmentStartedAt" TIMESTAMP(3),
ADD COLUMN "enrichmentCompletedAt" TIMESTAMP(3),
ADD COLUMN "enrichmentAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "sourceTitle" TEXT;

UPDATE "WordbookItem"
SET "meaningKo" = NULLIF(TRIM("meaning"), ''),
    "exampleSentenceEn" = NULLIF(TRIM(COALESCE("example", '')), ''),
    "exampleSentenceKo" = NULLIF(TRIM(COALESCE("exampleMeaning", '')), ''),
    "exampleSource" = CASE
      WHEN NULLIF(TRIM(COALESCE("example", '')), '') IS NOT NULL THEN 'SOURCE'::"ExampleSource"
      ELSE 'NONE'::"ExampleSource"
    END,
    "normalizedTerm" = LOWER(REGEXP_REPLACE(TRIM(REGEXP_REPLACE(COALESCE("term", ''), '^[[:punct:]]+|[[:punct:]]+$', '', 'g')), '\\s+', ' ', 'g'));

WITH ranked AS (
  SELECT id, "wordbookId", "normalizedTerm",
         ROW_NUMBER() OVER (PARTITION BY "wordbookId", "normalizedTerm" ORDER BY id) AS rn
  FROM "WordbookItem"
  WHERE "normalizedTerm" IS NOT NULL
)
UPDATE "WordbookItem" wi
SET "normalizedTerm" = CONCAT(ranked."normalizedTerm", '__dup_', wi.id)
FROM ranked
WHERE wi.id = ranked.id
  AND ranked.rn > 1;

CREATE INDEX "WordbookItem_enrichmentStatus_enrichmentQueuedAt_idx"
ON "WordbookItem"("enrichmentStatus", "enrichmentQueuedAt");

CREATE INDEX "WordbookItem_wordbookId_enrichmentStatus_idx"
ON "WordbookItem"("wordbookId", "enrichmentStatus");

CREATE UNIQUE INDEX "WordbookItem_wordbookId_normalizedTerm_key"
ON "WordbookItem"("wordbookId", "normalizedTerm");
