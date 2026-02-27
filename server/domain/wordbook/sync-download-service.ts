import { prisma } from "@/lib/prisma";
import { invalidateStudyPartStatsCacheForWordbook } from "@/lib/studyPartStatsCache";
import { aggregateVersionLogs } from "@/lib/wordbookVersion";

import type { RequestUser } from "@/lib/api/route-helpers";

export class WordbookSyncDownloadService {
  async syncForUser(input: {
    user: RequestUser;
    wordbookId: number;
    preserveStudyState: boolean;
  }) {
    const { user, wordbookId, preserveStudyState } = input;

    const result = await prisma.$transaction(async (tx) => {
      const download = await tx.wordbookDownload.findUnique({
        where: { userId_wordbookId: { userId: user.id, wordbookId } },
        select: {
          userId: true,
          wordbookId: true,
          downloadedVersion: true,
          snapshotItemCount: true
        }
      });
      if (!download) {
        return { ok: false as const, status: 403, error: "Download required." };
      }

      const wb = await tx.wordbook.findUnique({
        where: { id: wordbookId },
        select: { id: true, contentVersion: true }
      });
      if (!wb) {
        return { ok: false as const, status: 404, error: "Not found." };
      }

      const itemCount = await tx.wordbookItem.count({ where: { wordbookId } });

      const logs = await tx.wordbookVersionLog.findMany({
        where: { wordbookId, version: { gt: download.downloadedVersion } },
        select: { addedCount: true, updatedCount: true, deletedCount: true }
      });
      const summary = aggregateVersionLogs(logs);

      if (!preserveStudyState) {
        await tx.wordbookStudyItemState.deleteMany({ where: { userId: user.id, wordbookId } });
        await tx.wordbookStudyState.deleteMany({ where: { userId: user.id, wordbookId } });
      }

      const synced = await tx.wordbookDownload.update({
        where: { userId_wordbookId: { userId: user.id, wordbookId } },
        data: {
          downloadedVersion: wb.contentVersion,
          snapshotItemCount: itemCount,
          syncedAt: new Date()
        },
        select: { downloadedVersion: true, snapshotItemCount: true, syncedAt: true }
      });

      return {
        ok: true as const,
        summary,
        preserveStudyState,
        synced,
        beforeVersion: download.downloadedVersion,
        latestVersion: wb.contentVersion
      };
    });

    if (!result.ok) return result;

    if (!result.preserveStudyState) {
      invalidateStudyPartStatsCacheForWordbook(user.id, wordbookId);
    }

    return result;
  }
}
