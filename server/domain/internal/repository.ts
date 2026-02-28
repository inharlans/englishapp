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

  async getClipperBacklogCounts(): Promise<{ queued: number; processing: number }> {
    const rows = await prisma.wordbookItem.groupBy({
      by: ["enrichmentStatus"],
      where: {
        enrichmentStatus: {
          in: ["QUEUED", "PROCESSING"]
        }
      },
      _count: { _all: true }
    });
    let queued = 0;
    let processing = 0;
    for (const row of rows) {
      if (row.enrichmentStatus === "QUEUED") queued = row._count._all;
      if (row.enrichmentStatus === "PROCESSING") processing = row._count._all;
    }
    return { queued, processing };
  }

  async getClipperWaitPercentiles(): Promise<{ p50: number; p95: number }> {
    const rows = await prisma.$queryRaw<Array<{ p50: number | null; p95: number | null }>>(Prisma.sql`
      SELECT
        percentile_cont(0.50) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (NOW() - wi."enrichmentQueuedAt")) * 1000
        ) AS p50,
        percentile_cont(0.95) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (NOW() - wi."enrichmentQueuedAt")) * 1000
        ) AS p95
      FROM "WordbookItem" wi
      WHERE wi."enrichmentStatus" = 'QUEUED'::"EnrichmentStatus"
    `);
    const row = rows[0];
    return {
      p50: Math.max(0, Math.round(Number(row?.p50 ?? 0))),
      p95: Math.max(0, Math.round(Number(row?.p95 ?? 0)))
    };
  }

  async getClipperProcessPercentiles(input: { since: Date; end?: Date }): Promise<{ p50: number; p95: number }> {
    const rows = await prisma.$queryRaw<Array<{ p50: number | null; p95: number | null }>>(Prisma.sql`
      SELECT
        percentile_cont(0.50) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (wi."enrichmentCompletedAt" - wi."enrichmentStartedAt")) * 1000
        ) AS p50,
        percentile_cont(0.95) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (wi."enrichmentCompletedAt" - wi."enrichmentStartedAt")) * 1000
        ) AS p95
      FROM "WordbookItem" wi
      WHERE wi."enrichmentStatus" IN ('DONE'::"EnrichmentStatus", 'FAILED'::"EnrichmentStatus")
        AND wi."enrichmentStartedAt" IS NOT NULL
        AND wi."enrichmentCompletedAt" IS NOT NULL
        AND wi."enrichmentCompletedAt" >= ${input.since}
        ${input.end ? Prisma.sql`AND wi."enrichmentCompletedAt" < ${input.end}` : Prisma.empty}
    `);
    const row = rows[0];
    return {
      p50: Math.max(0, Math.round(Number(row?.p50 ?? 0))),
      p95: Math.max(0, Math.round(Number(row?.p95 ?? 0)))
    };
  }

  async getClipperHourlySeries(input: {
    since: Date;
    end?: Date;
  }): Promise<Array<{ hour: string; doneCount: number; failedCount: number }>> {
    const rows = await prisma.$queryRaw<
      Array<{ hour: Date; doneCount: number | bigint; failedCount: number | bigint }>
    >(Prisma.sql`
      SELECT
        date_trunc('hour', wi."enrichmentCompletedAt") AS hour,
        COUNT(*) FILTER (WHERE wi."enrichmentStatus" = 'DONE'::"EnrichmentStatus") AS "doneCount",
        COUNT(*) FILTER (WHERE wi."enrichmentStatus" = 'FAILED'::"EnrichmentStatus") AS "failedCount"
      FROM "WordbookItem" wi
      WHERE wi."enrichmentCompletedAt" >= ${input.since}
        ${input.end ? Prisma.sql`AND wi."enrichmentCompletedAt" < ${input.end}` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    return rows.map((row) => ({
      hour: row.hour.toISOString(),
      doneCount: Number(row.doneCount ?? 0),
      failedCount: Number(row.failedCount ?? 0)
    }));
  }

  async getClipperCompletionStats(input: {
    since: Date;
    end?: Date;
  }): Promise<{ doneCount: number; failedCount: number; successRate: number; failureRate: number }> {
    const rows = await prisma.$queryRaw<Array<{ doneCount: number | bigint; failedCount: number | bigint }>>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE wi."enrichmentStatus" = 'DONE'::"EnrichmentStatus") AS "doneCount",
        COUNT(*) FILTER (WHERE wi."enrichmentStatus" = 'FAILED'::"EnrichmentStatus") AS "failedCount"
      FROM "WordbookItem" wi
      WHERE wi."enrichmentCompletedAt" >= ${input.since}
        ${input.end ? Prisma.sql`AND wi."enrichmentCompletedAt" < ${input.end}` : Prisma.empty}
    `);
    const doneCount = Number(rows[0]?.doneCount ?? 0);
    const failedCount = Number(rows[0]?.failedCount ?? 0);
    const total = doneCount + failedCount;
    return {
      doneCount,
      failedCount,
      successRate: total > 0 ? doneCount / total : 0,
      failureRate: total > 0 ? failedCount / total : 0
    };
  }

  async getClipperFailureReasons(input: {
    since: Date;
    end?: Date;
  }): Promise<Array<{ reasonCode: string; count: number }>> {
    const rows = await prisma.$queryRaw<Array<{ reasonCode: string; cnt: number | bigint }>>(Prisma.sql`
      WITH reasoned AS (
        SELECT
          COALESCE(NULLIF(split_part(wi."enrichmentError", ':', 1), ''), 'UNKNOWN') AS "reasonCode"
        FROM "WordbookItem" wi
        WHERE wi."enrichmentStatus" = 'FAILED'::"EnrichmentStatus"
          AND wi."enrichmentCompletedAt" >= ${input.since}
          ${input.end ? Prisma.sql`AND wi."enrichmentCompletedAt" < ${input.end}` : Prisma.empty}
      )
      SELECT "reasonCode", COUNT(*) AS cnt
      FROM reasoned
      GROUP BY "reasonCode"
      ORDER BY cnt DESC
    `);
    return rows.map((row) => ({
      reasonCode: row.reasonCode,
      count: Number(row.cnt ?? 0)
    }));
  }

  async getClipperRetryStats(input: {
    since: Date;
    end?: Date;
  }): Promise<{ retryRate: number; retrySuccessRate: number }> {
    const rows = await prisma.$queryRaw<
      Array<{
        totalCompleted: number | bigint;
        retriedCompleted: number | bigint;
        retriedDone: number | bigint;
      }>
    >(Prisma.sql`
      WITH completed AS (
        SELECT wi."enrichmentAttempts", wi."enrichmentStatus"
        FROM "WordbookItem" wi
        WHERE wi."enrichmentStatus" IN ('DONE'::"EnrichmentStatus", 'FAILED'::"EnrichmentStatus")
          AND wi."enrichmentCompletedAt" >= ${input.since}
          ${input.end ? Prisma.sql`AND wi."enrichmentCompletedAt" < ${input.end}` : Prisma.empty}
      )
      SELECT
        COUNT(*) AS "totalCompleted",
        COUNT(*) FILTER (WHERE "enrichmentAttempts" > 1) AS "retriedCompleted",
        COUNT(*) FILTER (WHERE "enrichmentAttempts" > 1 AND "enrichmentStatus" = 'DONE'::"EnrichmentStatus") AS "retriedDone"
      FROM completed
    `);
    const totalCompleted = Number(rows[0]?.totalCompleted ?? 0);
    const retriedCompleted = Number(rows[0]?.retriedCompleted ?? 0);
    const retriedDone = Number(rows[0]?.retriedDone ?? 0);
    return {
      retryRate: totalCompleted > 0 ? retriedCompleted / totalCompleted : 0,
      retrySuccessRate: retriedCompleted > 0 ? retriedDone / retriedCompleted : 0
    };
  }

  async getClipperTerminalFailed(input: {
    maxAttempts: number;
    since?: Date;
    end?: Date;
  }): Promise<number> {
    const completedAtFilter =
      input.since || input.end
        ? {
            ...(input.since ? { gte: input.since } : {}),
            ...(input.end ? { lt: input.end } : {})
          }
        : undefined;
    return prisma.wordbookItem.count({
      where: {
        enrichmentStatus: "FAILED",
        enrichmentAttempts: { gte: input.maxAttempts },
        ...(completedAtFilter ? { enrichmentCompletedAt: completedAtFilter } : {})
      }
    });
  }

  async getClipperUxLatencyPercentile(input: { since: Date; end?: Date }): Promise<{ p95: number }> {
    const rows = await prisma.$queryRaw<Array<{ p95: number | null }>>(Prisma.sql`
      SELECT
        percentile_cont(0.95) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (wi."enrichmentCompletedAt" - wi."createdAt")) * 1000
        ) AS p95
        FROM "WordbookItem" wi
        WHERE wi."enrichmentStatus" = 'DONE'::"EnrichmentStatus"
        AND wi."enrichmentCompletedAt" IS NOT NULL
        AND wi."enrichmentCompletedAt" >= ${input.since}
        ${input.end ? Prisma.sql`AND wi."enrichmentCompletedAt" < ${input.end}` : Prisma.empty}
    `);
    return { p95: Math.max(0, Math.round(Number(rows[0]?.p95 ?? 0))) };
  }

  async getClipperPartialDoneRate(input: { since: Date; end?: Date }): Promise<number> {
    const rows = await prisma.$queryRaw<Array<{ doneTotal: number | bigint; partialTotal: number | bigint }>>(Prisma.sql`
      WITH done_rows AS (
        SELECT
          CASE
            WHEN wi."meaningKo" IS NOT NULL
             AND wi."partOfSpeech" IS NOT NULL
             AND (
               wi."exampleSource" = 'NONE'::"ExampleSource"
               OR (wi."exampleSentenceEn" IS NOT NULL AND wi."exampleSentenceKo" IS NOT NULL)
             )
            THEN false
            ELSE true
          END AS is_partial
        FROM "WordbookItem" wi
        WHERE wi."enrichmentStatus" = 'DONE'::"EnrichmentStatus"
          AND wi."enrichmentCompletedAt" >= ${input.since}
          ${input.end ? Prisma.sql`AND wi."enrichmentCompletedAt" < ${input.end}` : Prisma.empty}
      )
      SELECT
        COUNT(*) AS "doneTotal",
        COUNT(*) FILTER (WHERE is_partial) AS "partialTotal"
      FROM done_rows
    `);
    const doneTotal = Number(rows[0]?.doneTotal ?? 0);
    const partialTotal = Number(rows[0]?.partialTotal ?? 0);
    return doneTotal > 0 ? partialTotal / doneTotal : 0;
  }

  async getClipperCostEstimate(input: { since: Date; end?: Date }): Promise<{ charEstimate: number; tokenEstimate: number }> {
    const rows = await prisma.$queryRaw<Array<{ charEstimate: number | bigint | null }>>(Prisma.sql`
      SELECT
        SUM(
          COALESCE(length(wi."term"), 0)
          + COALESCE(length(wi."exampleSentenceEn"), 0)
          + COALESCE(length(wi."meaningKo"), 0)
          + COALESCE(length(wi."exampleSentenceKo"), 0)
        ) AS "charEstimate"
      FROM "WordbookItem" wi
      WHERE wi."enrichmentCompletedAt" >= ${input.since}
        ${input.end ? Prisma.sql`AND wi."enrichmentCompletedAt" < ${input.end}` : Prisma.empty}
    `);
    const charEstimate = Number(rows[0]?.charEstimate ?? 0);
    return {
      charEstimate,
      tokenEstimate: Math.round(charEstimate / 4)
    };
  }

  async getClipperCronCallStats(input: {
    since: Date;
    end?: Date;
  }): Promise<{ calls: number; errors: number }> {
    const row = await prisma.apiRequestMetric.aggregate({
      where: {
        route: "/api/internal/cron/clipper-enrichment",
        createdAt: {
          gte: input.since,
          ...(input.end ? { lt: input.end } : {})
        }
      },
      _count: { _all: true }
    });
    const errors = await prisma.apiRequestMetric.count({
      where: {
        route: "/api/internal/cron/clipper-enrichment",
        createdAt: {
          gte: input.since,
          ...(input.end ? { lt: input.end } : {})
        },
        status: { gte: 400 }
      }
    });
    return {
      calls: row._count._all,
      errors
    };
  }

  async countClipperFailedBetween(input: { start: Date; end: Date }): Promise<number> {
    return prisma.wordbookItem.count({
      where: {
        enrichmentStatus: "FAILED",
        enrichmentCompletedAt: {
          gte: input.start,
          lt: input.end
        }
      }
    });
  }

  async countClipperFailedByReasonSince(input: { since: Date; end?: Date; reasonCode: string }): Promise<number> {
    const rows = await prisma.$queryRaw<Array<{ cnt: number | bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS cnt
      FROM "WordbookItem" wi
      WHERE wi."enrichmentStatus" = 'FAILED'::"EnrichmentStatus"
        AND wi."enrichmentCompletedAt" >= ${input.since}
        ${input.end ? Prisma.sql`AND wi."enrichmentCompletedAt" < ${input.end}` : Prisma.empty}
        AND upper(COALESCE(NULLIF(split_part(wi."enrichmentError", ':', 1), ''), 'UNKNOWN')) = upper(${input.reasonCode})
    `);
    return Number(rows[0]?.cnt ?? 0);
  }
}
