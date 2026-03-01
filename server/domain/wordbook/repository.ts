import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { MARKET_BLOCK_KEYWORDS_IN_TITLE, MARKET_MIN_ITEM_COUNT } from "@/lib/wordbookPolicy";
import { bumpWordbookVersion } from "@/lib/wordbookVersion";
import type {
  CreateWordbookInput,
  MarketQuery,
  WordbookDetail,
  UpdateWordbookInput,
  WordbookSummary
} from "@/server/domain/wordbook/contracts";

export class WordbookRepository {
  async listOwnedWordbooks(ownerId: number): Promise<(WordbookSummary & { _count: { items: number } })[]> {
    return prisma.wordbook.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        fromLang: true,
        toLang: true,
        isPublic: true,
        downloadCount: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { items: true } }
      }
    });
  }

  async countOwnedWordbooks(ownerId: number): Promise<number> {
    return prisma.wordbook.count({ where: { ownerId } });
  }

  async createWordbook(ownerId: number, input: CreateWordbookInput, isPublic: boolean): Promise<WordbookSummary> {
    return prisma.wordbook.create({
      data: {
        ownerId,
        title: input.title,
        description: input.description,
        fromLang: input.fromLang,
        toLang: input.toLang,
        isPublic
      },
      select: {
        id: true,
        title: true,
        description: true,
        fromLang: true,
        toLang: true,
        isPublic: true,
        downloadCount: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async updateRankScore(wordbookId: number, rankScore: number): Promise<void> {
    await prisma.wordbook.update({
      where: { id: wordbookId },
      data: {
        rankScore,
        rankScoreUpdatedAt: new Date()
      }
    });
  }

  async findByIdWithItems(id: number): Promise<WordbookDetail | null> {
    return prisma.wordbook.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        title: true,
        description: true,
        fromLang: true,
        toLang: true,
        isPublic: true,
        hiddenByAdmin: true,
        downloadCount: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, email: true } },
        items: {
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: {
            id: true,
            term: true,
            meaning: true,
            pronunciation: true,
            example: true,
            exampleMeaning: true,
            position: true
          }
        }
      }
    });
  }

  async findWordbookMeta(id: number): Promise<{ ownerId: number; isPublic: boolean } | null> {
    return prisma.wordbook.findUnique({
      where: { id },
      select: { ownerId: true, isPublic: true }
    });
  }

  async findWordbookPublicVisibilityMeta(id: number): Promise<{
    id: number;
    ownerId: number;
    isPublic: boolean;
    hiddenByAdmin: boolean;
  } | null> {
    return prisma.wordbook.findUnique({
      where: { id },
      select: { id: true, ownerId: true, isPublic: true, hiddenByAdmin: true }
    });
  }

  async findMyDownloadAndRating(userId: number, wordbookId: number): Promise<{
    downloadedAt: Date | null;
    myRating: number | null;
  }> {
    const [download, rating] = await Promise.all([
      prisma.wordbookDownload.findUnique({
        where: { userId_wordbookId: { userId, wordbookId } },
        select: { createdAt: true }
      }),
      prisma.wordbookRating.findUnique({
        where: { userId_wordbookId: { userId, wordbookId } },
        select: { rating: true }
      })
    ]);
    return {
      downloadedAt: download?.createdAt ?? null,
      myRating: rating?.rating ?? null
    };
  }

  async updateWordbookAndReturn(id: number, data: UpdateWordbookInput): Promise<WordbookSummary> {
    return prisma.wordbook.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        fromLang: true,
        toLang: true,
        isPublic: true,
        downloadCount: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async updateWordbookAndBumpVersion(id: number, data: UpdateWordbookInput): Promise<WordbookSummary> {
    return prisma.$transaction(async (tx) => {
      const next = await tx.wordbook.update({
        where: { id },
        data,
        select: {
          id: true,
          title: true,
          description: true,
          fromLang: true,
          toLang: true,
          isPublic: true,
          downloadCount: true,
          ratingAvg: true,
          ratingCount: true,
          createdAt: true,
          updatedAt: true
        }
      });
      await bumpWordbookVersion(tx, id, { updatedCount: 1 });
      return next;
    });
  }

  async deleteWordbook(id: number): Promise<void> {
    await prisma.wordbook.delete({ where: { id } });
  }

  async findBlockedOwnerIds(userId: number): Promise<number[]> {
    const rows = await prisma.blockedOwner.findMany({
      where: { userId },
      select: { ownerId: true }
    });
    return rows.map((v) => v.ownerId);
  }

  async listReviews(wordbookId: number, take: number) {
    return prisma.wordbookRating.findMany({
      where: {
        wordbookId,
        OR: [{ review: { not: null } }, { rating: { gte: 1 } }]
      },
      orderBy: [{ updatedAt: "desc" }],
      take,
      select: {
        id: true,
        rating: true,
        review: true,
        updatedAt: true,
        user: { select: { email: true } }
      }
    });
  }

  async countRecentReportsByReporter(reporterId: number, since: Date): Promise<number> {
    return prisma.wordbookReport.count({
      where: { reporterId, createdAt: { gte: since } }
    });
  }

  async countOpenReportByReporterAndWordbook(reporterId: number, wordbookId: number): Promise<number> {
    return prisma.wordbookReport.count({
      where: {
        wordbookId,
        reporterId,
        status: "OPEN"
      }
    });
  }

  async countReportsByReporterAndStatus(reporterId: number, status: "RESOLVED" | "DISMISSED"): Promise<number> {
    return prisma.wordbookReport.count({
      where: { reporterId, status }
    });
  }

  async createReport(params: {
    wordbookId: number;
    reporterId: number;
    reason: string;
    detail: string | null;
    reporterTrustScore: number;
  }) {
    return prisma.wordbookReport.create({
      data: params,
      select: { id: true, status: true, createdAt: true }
    });
  }

  async findMarketPage(query: MarketQuery): Promise<{
    total: number;
    wordbooks: Array<{
      id: number;
      title: string;
      description: string | null;
      fromLang: string;
      toLang: string;
      isPublic: boolean;
      downloadCount: number;
      ratingAvg: number;
      ratingCount: number;
      createdAt: Date;
      updatedAt: Date;
      owner: { id: number; email: string };
      _count: { items: number };
    }>;
  }> {
    const offset = query.page * query.take;
    const search = query.q.trim();

    const blockedSql =
      query.blockedOwnerIds.length > 0
        ? Prisma.sql`AND wb."ownerId" NOT IN (${Prisma.join(query.blockedOwnerIds)})`
        : Prisma.empty;

    const searchSql =
      search.length > 0
        ? Prisma.sql`AND (wb."title" ILIKE ${`%${search}%`} OR coalesce(wb."description", '') ILIKE ${`%${search}%`})`
        : Prisma.empty;

    const blockedTitleClauses = MARKET_BLOCK_KEYWORDS_IN_TITLE.map(
      (kw) => Prisma.sql`lower(wb."title") LIKE ${`%${kw}%`}`
    );
    const blockedTitleSql =
      blockedTitleClauses.length > 0 ? Prisma.join(blockedTitleClauses, " OR ") : Prisma.sql`FALSE`;

    const orderBySql =
      query.sort === "new"
        ? Prisma.sql`cw."createdAt" DESC`
        : query.sort === "downloads"
          ? Prisma.sql`cw."downloadCount" DESC, cw."ratingAvg" DESC`
          : Prisma.sql`cw."rankScore" DESC, cw."createdAt" DESC`;

    const countRows = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      WITH candidate_wordbooks AS (
        SELECT wb."id"
        FROM "Wordbook" wb
        WHERE wb."isPublic" = true
          AND wb."hiddenByAdmin" = false
          ${searchSql}
          ${blockedSql}
          AND NOT (${blockedTitleSql})
      ), item_counter AS (
        SELECT wi."wordbookId" AS wordbook_id, COUNT(*)::int AS item_count
        FROM "WordbookItem" wi
        JOIN candidate_wordbooks cw ON cw."id" = wi."wordbookId"
        GROUP BY wi."wordbookId"
      )
      SELECT COUNT(*)::int AS total
      FROM candidate_wordbooks cw
      LEFT JOIN item_counter ON item_counter.wordbook_id = cw."id"
      WHERE COALESCE(item_counter.item_count, 0) >= ${MARKET_MIN_ITEM_COUNT}
    `);

    const rows = await prisma.$queryRaw<
      Array<{
        id: number;
        title: string;
        description: string | null;
        fromLang: string;
        toLang: string;
        isPublic: boolean;
        downloadCount: number;
        ratingAvg: number;
        ratingCount: number;
        createdAt: Date;
        updatedAt: Date;
        ownerId: number;
        ownerEmail: string;
        itemCount: number;
      }>
    >(Prisma.sql`
      WITH candidate_wordbooks AS (
        SELECT
          wb."id" AS "id",
          wb."title" AS "title",
          wb."description" AS "description",
          wb."fromLang" AS "fromLang",
          wb."toLang" AS "toLang",
          wb."isPublic" AS "isPublic",
          wb."downloadCount" AS "downloadCount",
          wb."ratingAvg" AS "ratingAvg",
          wb."ratingCount" AS "ratingCount",
          wb."createdAt" AS "createdAt",
          wb."updatedAt" AS "updatedAt",
          wb."rankScore" AS "rankScore",
          wb."ownerId" AS "ownerId"
        FROM "Wordbook" wb
        WHERE wb."isPublic" = true
          AND wb."hiddenByAdmin" = false
          ${searchSql}
          ${blockedSql}
          AND NOT (${blockedTitleSql})
      ), item_counter AS (
        SELECT wi."wordbookId" AS wordbook_id, COUNT(*)::int AS item_count
        FROM "WordbookItem" wi
        JOIN candidate_wordbooks cw ON cw."id" = wi."wordbookId"
        GROUP BY wi."wordbookId"
      )
      SELECT
        cw."id" AS id,
        cw."title" AS title,
        cw."description" AS description,
        cw."fromLang" AS "fromLang",
        cw."toLang" AS "toLang",
        cw."isPublic" AS "isPublic",
        cw."downloadCount" AS "downloadCount",
        cw."ratingAvg" AS "ratingAvg",
        cw."ratingCount" AS "ratingCount",
        cw."createdAt" AS "createdAt",
        cw."updatedAt" AS "updatedAt",
        u."id" AS "ownerId",
        u."email" AS "ownerEmail",
        COALESCE(item_counter.item_count, 0) AS "itemCount"
      FROM candidate_wordbooks cw
      JOIN "User" u ON u."id" = cw."ownerId"
      LEFT JOIN item_counter ON item_counter.wordbook_id = cw."id"
      WHERE COALESCE(item_counter.item_count, 0) >= ${MARKET_MIN_ITEM_COUNT}
      ORDER BY ${orderBySql}
      OFFSET ${offset}
      LIMIT ${query.take}
    `);

    return {
      total: countRows[0]?.total ?? 0,
      wordbooks: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        fromLang: row.fromLang,
        toLang: row.toLang,
        isPublic: row.isPublic,
        downloadCount: row.downloadCount,
        ratingAvg: row.ratingAvg,
        ratingCount: row.ratingCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        owner: { id: row.ownerId, email: row.ownerEmail },
        _count: { items: row.itemCount }
      }))
    };
  }

  async upsertBlockedOwner(userId: number, ownerId: number): Promise<void> {
    await prisma.blockedOwner.upsert({
      where: { userId_ownerId: { userId, ownerId } },
      create: { userId, ownerId },
      update: {}
    });
  }
}
