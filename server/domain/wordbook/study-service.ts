import { Prisma } from "@prisma/client";

import { buildItemWhere, buildMatchSql, type StudyView } from "@/lib/api/wordbook-study-query";
import { prisma } from "@/lib/prisma";
import {
  getStudyPartStatsFromCache,
  makeStudyPartStatsCacheKey,
  setStudyPartStatsCache
} from "@/lib/studyPartStatsCache";

export class WordbookStudyService {
  async getStudyPayload(input: {
    userId: number;
    wordbookId: number;
    view: StudyView;
    page: number;
    take: number;
    q: string;
    hideCorrect: boolean;
    partSize: number | null;
    requestedPartIndex: number;
  }) {
    const { userId, wordbookId, view, page, take, q, hideCorrect, partSize, requestedPartIndex } = input;

    const [wordbook, state, totalItems] = await Promise.all([
      prisma.wordbook.findUnique({
        where: { id: wordbookId },
        select: { id: true, title: true, description: true, fromLang: true, toLang: true }
      }),
      prisma.wordbookStudyState.findUnique({
        where: { userId_wordbookId: { userId, wordbookId } },
        select: { studiedCount: true, correctCount: true, wrongCount: true, updatedAt: true }
      }),
      prisma.wordbookItem.count({ where: { wordbookId } })
    ]);

    if (!wordbook) {
      return { ok: false as const, status: 404, error: "Not found." };
    }

    const partCount = partSize ? Math.max(1, Math.ceil(totalItems / partSize)) : 1;
    const partIndex = partSize ? Math.min(Math.max(requestedPartIndex, 1), partCount) : 1;
    const partStartValue = partSize ? (partIndex - 1) * partSize : 0;
    const partStart = partSize ? partStartValue : null;
    const partEndExclusive = partSize ? partStartValue + partSize : null;
    const partItemCount = partSize ? Math.max(0, Math.min(partSize, totalItems - partStartValue)) : totalItems;

    const where = buildItemWhere({
      wordbookId,
      userId,
      view,
      hideCorrect,
      q,
      partStart,
      partEndExclusive
    });

    const [totalFiltered, items] = await Promise.all([
      prisma.wordbookItem.count({ where }),
      prisma.wordbookItem.findMany({
        where,
        orderBy: [{ position: "asc" }, { id: "asc" }],
        skip: page * take,
        take,
        select: {
          id: true,
          term: true,
          meaning: true,
          pronunciation: true,
          example: true,
          exampleMeaning: true,
          exampleSentenceEn: true,
          exampleSentenceKo: true,
          exampleSource: true,
          partOfSpeech: true,
          position: true,
          studyItemStates: {
            where: { userId, wordbookId },
            take: 1,
            select: {
              itemId: true,
              status: true,
              streak: true,
              everCorrect: true,
              everWrong: true,
              lastResult: true,
              updatedAt: true
            }
          }
        }
      })
    ]);

    let partStats: Array<{ partIndex: number; totalInPart: number; matchedCount: number }> = [];
    if (partSize) {
      const cacheKey = makeStudyPartStatsCacheKey({
        userId,
        wordbookId,
        view,
        hideCorrect,
        q,
        partSize
      });
      const cached = getStudyPartStatsFromCache(cacheKey);
      if (cached) {
        partStats = cached;
      } else {
        const qLike = q ? `%${q.replace(/[%_]/g, "\\$&")}%` : null;
        const matchSql = buildMatchSql({ view, hideCorrect, qLike });
        const rows = await prisma.$queryRaw<Array<{ partIndex: number; totalInPart: number; matchedCount: number }>>(
          Prisma.sql`
            SELECT
              (((wi."position" - 1) / ${partSize})::int + 1) AS "partIndex",
              COUNT(*)::int AS "totalInPart",
              COUNT(*) FILTER (WHERE ${matchSql})::int AS "matchedCount"
            FROM "WordbookItem" wi
            LEFT JOIN "WordbookStudyItemState" ws
              ON ws."itemId" = wi."id"
             AND ws."wordbookId" = wi."wordbookId"
             AND ws."userId" = ${userId}
            WHERE wi."wordbookId" = ${wordbookId}
            GROUP BY "partIndex"
            ORDER BY "partIndex" ASC
          `
        );
        partStats = rows;
        setStudyPartStatsCache(cacheKey, rows);
      }
    }

    return {
      ok: true as const,
      payload: {
        wordbook,
        studyState: state ?? {
          studiedCount: 0,
          correctCount: 0,
          wrongCount: 0,
          updatedAt: null
        },
        items: items.map((it) => ({
          id: it.id,
          term: it.term,
          meaning: it.meaning,
          pronunciation: it.pronunciation,
          example: it.example,
          exampleMeaning: it.exampleMeaning,
          exampleSentenceEn: it.exampleSentenceEn,
          exampleSentenceKo: it.exampleSentenceKo,
          exampleSource: it.exampleSource,
          partOfSpeech: it.partOfSpeech,
          position: it.position,
          itemState: it.studyItemStates[0] ?? null
        })),
        paging: {
          page,
          take,
          totalFiltered,
          totalItems,
          partSize,
          partIndex,
          partCount,
          partItemCount,
          partStats
        }
      }
    };
  }
}
