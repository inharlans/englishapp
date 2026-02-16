ALTER TABLE "Wordbook" ADD COLUMN "rankScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Wordbook" ADD COLUMN "rankScoreUpdatedAt" TIMESTAMP(3);

UPDATE "Wordbook"
SET
  "rankScore" =
    (
      (("ratingAvg" * "ratingCount") + (3.8 * 8)) / ("ratingCount" + 8)
      + (LOG(10, "downloadCount" + 1) * 0.35)
      + GREATEST(0, 0.45 - ((EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 86400) / 240))
      - CASE WHEN "ratingCount" < 2 THEN 0.2 ELSE 0 END
    ),
  "rankScoreUpdatedAt" = NOW();

CREATE INDEX "Wordbook_isPublic_hiddenByAdmin_rankScore_createdAt_idx"
ON "Wordbook"("isPublic", "hiddenByAdmin", "rankScore", "createdAt");
