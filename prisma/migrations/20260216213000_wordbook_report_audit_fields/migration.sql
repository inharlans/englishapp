ALTER TABLE "WordbookReport"
  ADD COLUMN "reporterTrustScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reviewAction" TEXT,
  ADD COLUMN "previousStatus" "WordbookReportStatus",
  ADD COLUMN "nextStatus" "WordbookReportStatus",
  ADD COLUMN "reviewerIpHash" TEXT;
