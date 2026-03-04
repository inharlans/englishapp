import { LastResult, Prisma } from "@prisma/client";

import { getUserDownloadedWordCount } from "@/lib/planLimits";
import { prisma } from "@/lib/prisma";
import { aggregateVersionLogs } from "@/lib/wordbookVersion";
import { MARKET_BLOCK_KEYWORDS_IN_TITLE, MARKET_MIN_ITEM_COUNT, shouldHideWordbookFromMarket } from "@/lib/wordbookPolicy";

type MarketSort = "top" | "new" | "downloads";
type MarketSize = "all" | "100-300" | "301-700" | "701+";

function getSizeBounds(size: MarketSize): { min: number; max: number | null } {
  if (size === "100-300") return { min: 100, max: 300 };
  if (size === "301-700") return { min: 301, max: 700 };
  if (size === "701+") return { min: 701, max: null };
  return { min: MARKET_MIN_ITEM_COUNT, max: null };
}

function escapeSqlLikePattern(input: string): string {
  return input.replace(/([\\%_])/g, "\\$1");
}

export class WordbookPageQueryService {
  async getLibraryPageData(userId: number) {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [mine, downloaded, downloadedWordCount, todayCorrect] = await Promise.all([
      prisma.wordbook.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          isPublic: true,
          downloadCount: true,
          ratingAvg: true,
          ratingCount: true,
          updatedAt: true,
          _count: { select: { items: true } }
        }
      }),
      prisma.wordbookDownload.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          downloadedVersion: true,
          snapshotItemCount: true,
          syncedAt: true,
          wordbook: {
            select: {
              id: true,
              title: true,
              description: true,
              isPublic: true,
              downloadCount: true,
              ratingAvg: true,
              ratingCount: true,
              contentVersion: true,
              owner: { select: { email: true } },
              updatedAt: true,
              _count: { select: { items: true } }
            }
          }
        }
      }),
      getUserDownloadedWordCount(userId),
      prisma.wordbookStudyItemState.count({
        where: {
          userId,
          lastResult: LastResult.CORRECT,
          updatedAt: {
            gte: dayStart,
            lt: dayEnd
          }
        }
      })
    ]);

    const downloadedWordbookIds = downloaded.map((download) => download.wordbook.id);
    const minVersions = new Map<number, number>();
    for (const download of downloaded) {
      const prev = minVersions.get(download.wordbook.id);
      if (prev === undefined || download.downloadedVersion < prev) {
        minVersions.set(download.wordbook.id, download.downloadedVersion);
      }
    }

    const logs = downloadedWordbookIds.length
      ? await prisma.wordbookVersionLog.findMany({
          where: {
            wordbookId: { in: downloadedWordbookIds },
            version: { gt: Math.min(...Array.from(minVersions.values())) }
          },
          select: { wordbookId: true, version: true, addedCount: true, updatedCount: true, deletedCount: true }
        })
      : [];

    return {
      mine,
      downloaded,
      downloadedWordCount,
      todayCorrect,
      downloadedWordbookIds,
      logs
    };
  }

  async getMarketPageData(input: {
    userId: number | null;
    q: string;
    sort: MarketSort;
    size: MarketSize;
    requestedPage: number;
    take: number;
  }) {
    const blockedOwnerIds = input.userId
      ? (
          await prisma.blockedOwner.findMany({
            where: { userId: input.userId },
            select: { ownerId: true }
          })
        ).map((row) => row.ownerId)
      : [];

    const search = input.q.trim();
    const escapedSearch = escapeSqlLikePattern(search);
    const searchPattern = `%${escapedSearch}%`;
    const sizeBounds = getSizeBounds(input.size);

    const blockedSql =
      blockedOwnerIds.length > 0
        ? Prisma.sql`AND wb."ownerId" NOT IN (${Prisma.join(blockedOwnerIds)})`
        : Prisma.empty;

    const searchSql =
      search.length > 0
        ? Prisma.sql`
            AND (
              wb."title" ILIKE ${searchPattern}
                ESCAPE '\\'
              OR coalesce(wb."description", '') ILIKE ${searchPattern}
                ESCAPE '\\'
              OR EXISTS (
                SELECT 1
                FROM "User" u
                WHERE u."id" = wb."ownerId"
                  AND u."email" ILIKE ${searchPattern}
                    ESCAPE '\\'
              )
            )
          `
        : Prisma.empty;

    const sqlBlockedKeywords = MARKET_BLOCK_KEYWORDS_IN_TITLE.filter((keyword) =>
      shouldHideWordbookFromMarket({ title: keyword, itemCount: MARKET_MIN_ITEM_COUNT })
    );

    const blockedTitleClauses = sqlBlockedKeywords.map((kw) => {
      const escapedKeyword = escapeSqlLikePattern(kw.toLowerCase());
      const blockedPattern = `%${escapedKeyword}%`;
      return Prisma.sql`lower(wb."title") LIKE ${blockedPattern} ESCAPE '\\'`;
    });
    const blockedTitleSql =
      blockedTitleClauses.length > 0 ? Prisma.join(blockedTitleClauses, " OR ") : Prisma.sql`FALSE`;

    const itemCountLowerSql = Prisma.sql`COALESCE(item_counter.item_count, 0) >= ${sizeBounds.min}`;
    const itemCountUpperSql =
      sizeBounds.max !== null
        ? Prisma.sql`AND COALESCE(item_counter.item_count, 0) <= ${sizeBounds.max}`
        : Prisma.empty;

    const orderBySql =
      input.sort === "new"
        ? Prisma.sql`cw."createdAt" DESC`
        : input.sort === "downloads"
          ? Prisma.sql`cw."downloadCount" DESC, cw."ratingAvg" DESC`
          : Prisma.sql`cw."rankScore" DESC, cw."createdAt" DESC`;

    const countRows = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      WITH candidate_wordbooks AS (
        SELECT wb."id"
        FROM "Wordbook" wb
        WHERE wb."isPublic" = true
          AND wb."hiddenByAdmin" = false
          ${blockedSql}
          ${searchSql}
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
      WHERE ${itemCountLowerSql}
        ${itemCountUpperSql}
    `);

    const total = countRows[0]?.total ?? 0;
    const maxPage = Math.max(Math.ceil(total / input.take) - 1, 0);
    const page = Math.min(input.requestedPage, maxPage);
    const offset = page * input.take;

    const [rows, myDownloads, myDownloadedWordCount] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          id: number;
          title: string;
          description: string | null;
          fromLang: string;
          toLang: string;
          downloadCount: number;
          ratingAvg: number;
          ratingCount: number;
          createdAt: Date;
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
            wb."downloadCount" AS "downloadCount",
            wb."ratingAvg" AS "ratingAvg",
            wb."ratingCount" AS "ratingCount",
            wb."createdAt" AS "createdAt",
            wb."rankScore" AS "rankScore",
            wb."ownerId" AS "ownerId"
          FROM "Wordbook" wb
          WHERE wb."isPublic" = true
            AND wb."hiddenByAdmin" = false
            ${blockedSql}
            ${searchSql}
            AND NOT (${blockedTitleSql})
        ), item_counter AS (
          SELECT wi."wordbookId" AS wordbook_id, COUNT(*)::int AS item_count
          FROM "WordbookItem" wi
          JOIN candidate_wordbooks cw ON cw."id" = wi."wordbookId"
          GROUP BY wi."wordbookId"
        )
        SELECT
          cw."id" AS "id",
          cw."title" AS "title",
          cw."description" AS "description",
          cw."fromLang" AS "fromLang",
          cw."toLang" AS "toLang",
          cw."downloadCount" AS "downloadCount",
          cw."ratingAvg" AS "ratingAvg",
          cw."ratingCount" AS "ratingCount",
          cw."createdAt" AS "createdAt",
          u."id" AS "ownerId",
          u."email" AS "ownerEmail",
          COALESCE(item_counter.item_count, 0) AS "itemCount"
        FROM candidate_wordbooks cw
        JOIN "User" u ON u."id" = cw."ownerId"
        LEFT JOIN item_counter ON item_counter.wordbook_id = cw."id"
        WHERE ${itemCountLowerSql}
          ${itemCountUpperSql}
        ORDER BY ${orderBySql}
        OFFSET ${offset}
        LIMIT ${input.take}
      `),
      input.userId
        ? prisma.wordbookDownload.findMany({
            where: { userId: input.userId },
            select: { wordbookId: true }
          })
        : Promise.resolve([]),
      input.userId ? getUserDownloadedWordCount(input.userId) : Promise.resolve(0)
    ]);

    const wordbooks = rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      fromLang: row.fromLang,
      toLang: row.toLang,
      downloadCount: row.downloadCount,
      ratingAvg: row.ratingAvg,
      ratingCount: row.ratingCount,
      createdAt: row.createdAt,
      owner: { id: row.ownerId, email: row.ownerEmail },
      _count: { items: row.itemCount }
    }));

    return {
      total,
      maxPage,
      page,
      wordbooks,
      downloadedIds: new Set(myDownloads.map((download) => download.wordbookId)),
      myDownloadedWordCount
    };
  }

  async getWordbookDetailPageData(input: {
    wordbookId: number;
    userId: number | null;
    page: number;
    take: number;
  }) {
    const wordbook = await prisma.wordbook.findUnique({
      where: { id: input.wordbookId },
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
        contentVersion: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { email: true } },
        _count: { select: { items: true } }
      }
    });

    if (!wordbook) return null;

    const totalItemCount = wordbook._count.items;
    const pageCount = Math.max(1, Math.ceil(totalItemCount / input.take));
    const currentPage = Math.min(input.page, pageCount - 1);

    const pagedItems = await prisma.wordbookItem.findMany({
      where: { wordbookId: input.wordbookId },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      skip: currentPage * input.take,
      take: input.take,
      select: {
        id: true,
        term: true,
        meaning: true,
        pronunciation: true,
        example: true,
        exampleMeaning: true,
        position: true
      }
    });

    const [downloadRow, ratingRow, downloadedWordCount] = input.userId
      ? await Promise.all([
          prisma.wordbookDownload.findUnique({
            where: { userId_wordbookId: { userId: input.userId, wordbookId: input.wordbookId } },
            select: { createdAt: true, downloadedVersion: true, snapshotItemCount: true, syncedAt: true }
          }),
          prisma.wordbookRating.findUnique({
            where: { userId_wordbookId: { userId: input.userId, wordbookId: input.wordbookId } },
            select: { rating: true, review: true }
          }),
          getUserDownloadedWordCount(input.userId)
        ])
      : [null, null, 0];

    const downloadedVersion = downloadRow?.downloadedVersion ?? null;
    const versionSummary =
      downloadedVersion && wordbook.contentVersion > downloadedVersion
        ? aggregateVersionLogs(
            await prisma.wordbookVersionLog.findMany({
              where: { wordbookId: input.wordbookId, version: { gt: downloadedVersion } },
              select: { addedCount: true, updatedCount: true, deletedCount: true }
            })
          )
        : { addedCount: 0, updatedCount: 0, deletedCount: 0 };

    return {
      wordbook,
      pagedItems,
      pageCount,
      currentPage,
      downloadRow,
      ratingRow,
      downloadedWordCount,
      versionSummary
    };
  }
}
