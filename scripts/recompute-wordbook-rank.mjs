/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

function computeRankScore(input) {
  const priorMean = 3.8;
  const priorWeight = 8;
  const bayesian =
    (input.ratingAvg * input.ratingCount + priorMean * priorWeight) /
    (input.ratingCount + priorWeight);
  const downloadBoost = Math.log10(input.downloadCount + 1) * 0.35;
  const ageDays = Math.max(0, (Date.now() - input.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const recencyBoost = Math.max(0, 0.45 - ageDays / 240);
  const lowSamplePenalty = input.ratingCount < 2 ? 0.2 : 0;
  return bayesian + downloadBoost + recencyBoost - lowSamplePenalty;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const wordbooks = await prisma.wordbook.findMany({
      select: {
        id: true,
        ratingAvg: true,
        ratingCount: true,
        downloadCount: true,
        createdAt: true
      }
    });
    let updated = 0;
    for (const wb of wordbooks) {
      const rankScore = computeRankScore({
        ratingAvg: wb.ratingAvg,
        ratingCount: wb.ratingCount,
        downloadCount: wb.downloadCount,
        createdAt: wb.createdAt
      });
      await prisma.wordbook.update({
        where: { id: wb.id },
        data: { rankScore, rankScoreUpdatedAt: new Date() }
      });
      updated += 1;
    }
    console.log(`[recompute-rank] updated ${updated} wordbooks`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[recompute-rank] error:", err);
  process.exitCode = 1;
});

