import { prisma } from "@/lib/prisma";
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

  async findMarketCandidates(query: MarketQuery) {
    return prisma.wordbook.findMany({
      where: {
        isPublic: true,
        hiddenByAdmin: false,
        ...(query.blockedOwnerIds.length > 0 ? { ownerId: { notIn: query.blockedOwnerIds } } : {}),
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: "insensitive" as const } },
                { description: { contains: query.q, mode: "insensitive" as const } }
              ]
            }
          : {})
      },
      orderBy:
        query.sort === "new"
          ? [{ createdAt: "desc" as const }]
          : query.sort === "downloads"
            ? [{ downloadCount: "desc" as const }, { ratingAvg: "desc" as const }]
            : [{ rankScore: "desc" as const }, { createdAt: "desc" as const }],
      select: {
        id: true,
        title: true,
        description: true,
        owner: { select: { email: true } },
        _count: { select: { items: true } }
      }
    });
  }

  async findMarketPageByIds(ids: number[]) {
    if (ids.length === 0) return [];
    return prisma.wordbook.findMany({
      where: { id: { in: ids } },
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
        owner: { select: { id: true, email: true } },
        _count: { select: { items: true } }
      }
    });
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

  async upsertBlockedOwner(userId: number, ownerId: number): Promise<void> {
    await prisma.blockedOwner.upsert({
      where: { userId_ownerId: { userId, ownerId } },
      create: { userId, ownerId },
      update: {}
    });
  }
}
