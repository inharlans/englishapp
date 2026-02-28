import { LastResult } from "@prisma/client";

import { getUserDownloadedWordCount } from "@/lib/planLimits";
import { prisma } from "@/lib/prisma";
import { aggregateVersionLogs } from "@/lib/wordbookVersion";
import { MARKET_MIN_ITEM_COUNT, shouldHideWordbookFromMarket } from "@/lib/wordbookPolicy";

type MarketSort = "top" | "new" | "downloads";
type MarketSize = "all" | "100-300" | "301-700" | "701+";

function matchesSize(itemCount: number, size: MarketSize): boolean {
  if (size === "100-300") return itemCount >= 100 && itemCount <= 300;
  if (size === "301-700") return itemCount >= 301 && itemCount <= 700;
  if (size === "701+") return itemCount >= 701;
  return true;
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

    const where = {
      isPublic: true,
      hiddenByAdmin: false,
      ...(blockedOwnerIds.length > 0 ? { ownerId: { notIn: blockedOwnerIds } } : {}),
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q, mode: "insensitive" as const } },
              { description: { contains: input.q, mode: "insensitive" as const } },
              { owner: { email: { contains: input.q, mode: "insensitive" as const } } }
            ]
          }
        : {})
    };

    const orderBy =
      input.sort === "new"
        ? [{ createdAt: "desc" as const }]
        : input.sort === "downloads"
          ? [{ downloadCount: "desc" as const }, { ratingAvg: "desc" as const }]
          : [{ rankScore: "desc" as const }, { createdAt: "desc" as const }];

    const candidates = await prisma.wordbook.findMany({
      where,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        owner: { select: { email: true } },
        _count: { select: { items: true } }
      }
    });

    const eligibleIds = candidates
      .filter(
        (wordbook) =>
          wordbook._count.items >= MARKET_MIN_ITEM_COUNT &&
          matchesSize(wordbook._count.items, input.size) &&
          !shouldHideWordbookFromMarket({
            title: wordbook.title,
            itemCount: wordbook._count.items
          })
      )
      .map((wordbook) => wordbook.id);

    const total = eligibleIds.length;
    const maxPage = Math.max(Math.ceil(total / input.take) - 1, 0);
    const page = Math.min(input.requestedPage, maxPage);
    const pageIds = eligibleIds.slice(page * input.take, page * input.take + input.take);

    const [wordbooksUnordered, myDownloads, myDownloadedWordCount] = await Promise.all([
      pageIds.length > 0
        ? prisma.wordbook.findMany({
            where: { id: { in: pageIds } },
            select: {
              id: true,
              title: true,
              description: true,
              fromLang: true,
              toLang: true,
              downloadCount: true,
              ratingAvg: true,
              ratingCount: true,
              createdAt: true,
              owner: { select: { id: true, email: true } },
              _count: { select: { items: true } }
            }
          })
        : Promise.resolve([]),
      input.userId
        ? prisma.wordbookDownload.findMany({
            where: { userId: input.userId },
            select: { wordbookId: true }
          })
        : Promise.resolve([]),
      input.userId ? getUserDownloadedWordCount(input.userId) : Promise.resolve(0)
    ]);

    const byId = new Map(wordbooksUnordered.map((wordbook) => [wordbook.id, wordbook] as const));
    const wordbooks = pageIds
      .map((id) => byId.get(id))
      .filter((wordbook): wordbook is NonNullable<typeof wordbook> => wordbook !== undefined);

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
