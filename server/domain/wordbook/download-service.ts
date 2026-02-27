import { FREE_DOWNLOAD_WORD_LIMIT } from "@/lib/planLimits";
import { prisma } from "@/lib/prisma";
import { isActiveProPlan } from "@/lib/userPlan";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";

import type { RequestUser } from "@/lib/api/route-helpers";

export class WordbookDownloadService {
  async downloadForUser(user: RequestUser, wordbookId: number) {
    return prisma.$transaction(async (tx) => {
      const wordbook = await tx.wordbook.findUnique({
        where: { id: wordbookId },
        select: { id: true, title: true, isPublic: true, hiddenByAdmin: true, downloadCount: true, contentVersion: true }
      });
      if (!wordbook || !wordbook.isPublic || wordbook.hiddenByAdmin) {
        return { ok: false as const, status: 404, error: "Not found." };
      }

      const existing = await tx.wordbookDownload.findUnique({
        where: { userId_wordbookId: { userId: user.id, wordbookId } },
        select: { id: true, createdAt: true }
      });

      if (existing) {
        return {
          ok: true as const,
          already: true,
          downloadedAt: existing.createdAt,
          downloadCount: wordbook.downloadCount,
          wordbookTitle: wordbook.title
        };
      }

      const itemCount = await tx.wordbookItem.count({ where: { wordbookId } });

      if (!isActiveProPlan({ plan: user.plan, proUntil: user.proUntil })) {
        const usedRows = await tx.wordbookDownload.findMany({
          where: { userId: user.id },
          select: { wordbookId: true, snapshotItemCount: true }
        });
        let usedWords = 0;
        const missingWordbookIds: number[] = [];
        for (const row of usedRows) {
          if (typeof row.snapshotItemCount === "number") {
            usedWords += Math.max(0, row.snapshotItemCount);
          } else {
            missingWordbookIds.push(row.wordbookId);
          }
        }
        if (missingWordbookIds.length > 0) {
          const grouped = await tx.wordbookItem.groupBy({
            by: ["wordbookId"],
            where: { wordbookId: { in: missingWordbookIds } },
            _count: { _all: true }
          });
          usedWords += grouped.reduce((acc, row) => acc + row._count._all, 0);
        }

        if (usedWords + itemCount > FREE_DOWNLOAD_WORD_LIMIT) {
          return {
            ok: false as const,
            status: 402,
            error: `무료 요금제 누적 다운로드 한도(${FREE_DOWNLOAD_WORD_LIMIT}단어)에 도달했습니다.`
          };
        }
      }

      const created = await tx.wordbookDownload.create({
        data: {
          userId: user.id,
          wordbookId,
          downloadedVersion: wordbook.contentVersion,
          snapshotItemCount: itemCount,
          syncedAt: new Date()
        },
        select: { createdAt: true }
      });

      const updated = await tx.wordbook.update({
        where: { id: wordbookId },
        data: { downloadCount: { increment: 1 } },
        select: { downloadCount: true }
      });
      await refreshWordbookRankScore(tx, wordbookId);

      return {
        ok: true as const,
        already: false,
        downloadedAt: created.createdAt,
        downloadCount: updated.downloadCount,
        wordbookTitle: wordbook.title
      };
    });
  }
}
