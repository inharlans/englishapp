import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";

export type ClipperQueueItem = {
  id: number;
  ownerId: number;
  wordbookId: number;
  term: string;
  exampleSentenceEn: string | null;
  enrichmentAttempts: number;
  enrichmentQueuedAt: Date;
};

export class InternalRepository {
  async findExpiredProUserIds(now: Date): Promise<number[]> {
    const expiredUsers = await prisma.user.findMany({
      where: {
        plan: "PRO",
        proUntil: { not: null, lt: now }
      },
      select: { id: true }
    });
    return expiredUsers.map((u) => u.id);
  }

  async expirePlans(userIds: number[]): Promise<number> {
    if (userIds.length === 0) return 0;
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { plan: "FREE", stripeSubscriptionStatus: "expired" }
    });
    return result.count;
  }

  async countStaleWordbookRanks(staleBefore: Date): Promise<number> {
    return prisma.wordbook.count({
      where: {
        OR: [{ rankScoreUpdatedAt: null }, { rankScoreUpdatedAt: { lt: staleBefore } }]
      }
    });
  }

  async findAllWordbookIds(): Promise<number[]> {
    const ids = await prisma.wordbook.findMany({ select: { id: true } });
    return ids.map((v) => v.id);
  }

  async recomputeWordbookRank(wordbookId: number): Promise<void> {
    await refreshWordbookRankScore(prisma, wordbookId);
  }

  async listQueuedClipperItems(limit: number): Promise<ClipperQueueItem[]> {
    return prisma.wordbookItem.findMany({
      where: { enrichmentStatus: "QUEUED" },
      orderBy: { enrichmentQueuedAt: "asc" },
      take: limit,
      select: {
        id: true,
        wordbookId: true,
        term: true,
        exampleSentenceEn: true,
        enrichmentAttempts: true,
        enrichmentQueuedAt: true,
        wordbook: {
          select: {
            ownerId: true
          }
        }
      }
    }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        ownerId: row.wordbook.ownerId,
        wordbookId: row.wordbookId,
        term: row.term,
        exampleSentenceEn: row.exampleSentenceEn,
        enrichmentAttempts: row.enrichmentAttempts,
        enrichmentQueuedAt: row.enrichmentQueuedAt
      }))
    );
  }

  async claimQueuedClipperItemsByIds(ids: number[]): Promise<number[]> {
    if (ids.length === 0) return [];
    const now = new Date();
    const rows = await prisma.$queryRaw<Array<{ id: number }>>(
      Prisma.sql`
        UPDATE "WordbookItem" wi
        SET
          "enrichmentStatus" = 'PROCESSING'::"EnrichmentStatus",
          "enrichmentStartedAt" = ${now},
          "enrichmentAttempts" = wi."enrichmentAttempts" + 1
        WHERE wi."id" IN (${Prisma.join(ids)})
          AND wi."enrichmentStatus" = 'QUEUED'::"EnrichmentStatus"
        RETURNING wi."id"
      `
    );
    return rows.map((row) => row.id);
  }

  async loadClipperItemsForProcessing(ids: number[]): Promise<Array<{
    id: number;
    term: string;
    meaning: string;
    exampleSentenceEn: string | null;
  }>> {
    if (ids.length === 0) return [];
    return prisma.wordbookItem.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        term: true,
        meaning: true,
        exampleSentenceEn: true
      }
    });
  }

  async markClipperItemDone(input: {
    id: number;
    meaningKo: string | null;
    partOfSpeech: "NOUN" | "VERB" | "ADJECTIVE" | "ADVERB" | "PHRASE" | "OTHER" | "UNKNOWN";
    exampleSentenceEn: string | null;
    exampleSentenceKo: string | null;
    exampleSource: "SOURCE" | "AI" | "NONE";
  }): Promise<void> {
    await prisma.wordbookItem.update({
      where: { id: input.id },
      data: {
        meaningKo: input.meaningKo,
        meaning: input.meaningKo ?? undefined,
        partOfSpeech: input.partOfSpeech,
        exampleSentenceEn: input.exampleSentenceEn,
        exampleSentenceKo: input.exampleSentenceKo,
        example: input.exampleSentenceEn,
        exampleMeaning: input.exampleSentenceKo,
        exampleSource: input.exampleSource,
        enrichmentStatus: "DONE",
        enrichmentError: null,
        enrichmentCompletedAt: new Date()
      }
    });
  }

  async markClipperItemFailed(input: {
    id: number;
    message: string;
  }): Promise<void> {
    await prisma.wordbookItem.update({
      where: { id: input.id },
      data: {
        enrichmentStatus: "FAILED",
        enrichmentError: input.message.slice(0, 300),
        enrichmentCompletedAt: new Date()
      }
    });
  }

  async listRetriableFailedClipperItems(input: {
    maxAttempts: number;
    limit: number;
  }): Promise<Array<{ id: number; enrichmentAttempts: number; enrichmentCompletedAt: Date | null }>> {
    return prisma.wordbookItem.findMany({
      where: {
        enrichmentStatus: "FAILED",
        enrichmentAttempts: { lt: input.maxAttempts }
      },
      orderBy: { enrichmentCompletedAt: "asc" },
      take: input.limit,
      select: {
        id: true,
        enrichmentAttempts: true,
        enrichmentCompletedAt: true
      }
    });
  }

  async requeueClipperItems(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await prisma.wordbookItem.updateMany({
      where: {
        id: { in: ids },
        enrichmentStatus: "FAILED"
      },
      data: {
        enrichmentStatus: "QUEUED",
        enrichmentError: null,
        enrichmentQueuedAt: new Date(),
        enrichmentStartedAt: null
      }
    });
    return result.count;
  }
}
