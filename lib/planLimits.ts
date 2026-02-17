import { prisma } from "@/lib/prisma";

export const FREE_DOWNLOAD_WORD_LIMIT = 1000;

export async function getUserDownloadedWordCount(userId: number): Promise<number> {
  const rows = await prisma.wordbookDownload.findMany({
    where: { userId },
    select: { wordbookId: true, snapshotItemCount: true }
  });

  let total = 0;
  const missingWordbookIds: number[] = [];
  for (const row of rows) {
    if (typeof row.snapshotItemCount === "number") {
      total += Math.max(0, row.snapshotItemCount);
    } else {
      missingWordbookIds.push(row.wordbookId);
    }
  }

  if (missingWordbookIds.length > 0) {
    const grouped = await prisma.wordbookItem.groupBy({
      by: ["wordbookId"],
      where: { wordbookId: { in: missingWordbookIds } },
      _count: { _all: true }
    });
    total += grouped.reduce((acc, row) => acc + row._count._all, 0);
  }

  return total;
}
