type RankInput = {
  ratingAvg: number;
  ratingCount: number;
  downloadCount: number;
  createdAt: Date;
};

export function computeWordbookRankScore(input: RankInput): number {
  const priorMean = 3.8;
  const priorWeight = 8;
  const bayesian =
    (input.ratingAvg * input.ratingCount + priorMean * priorWeight) /
    (input.ratingCount + priorWeight);

  const downloadBoost = Math.log10(input.downloadCount + 1) * 0.35;
  const ageDays = Math.max(
    0,
    (Date.now() - input.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const recencyBoost = Math.max(0, 0.45 - ageDays / 240);
  const lowSamplePenalty = input.ratingCount < 2 ? 0.2 : 0;

  return bayesian + downloadBoost + recencyBoost - lowSamplePenalty;
}

