import { LastResult, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class WordsRepository {
  async listWordIds(skip?: number, take?: number) {
    const words = await prisma.word.findMany({
      orderBy: { id: "asc" },
      skip,
      take,
      select: { id: true }
    });
    return words.map((word) => word.id);
  }

  async listHalfScopeWordIds(userId: number, skip?: number, take?: number) {
    const rows = await prisma.resultState.findMany({
      where: { userId, everCorrect: true, everWrong: true },
      orderBy: { wordId: "asc" },
      skip,
      take,
      select: { wordId: true }
    });
    return rows.map((row) => row.wordId);
  }

  async listWordsByIds(wordIds: number[]) {
    if (wordIds.length === 0) return [];
    return prisma.word.findMany({
      where: { id: { in: wordIds } },
      orderBy: { id: "asc" },
      select: { id: true, en: true, ko: true }
    });
  }

  async listProgressRows(userId: number, wordIds: number[]) {
    if (wordIds.length === 0) return [];
    return prisma.progress.findMany({
      where: { userId, wordId: { in: wordIds } },
      select: {
        wordId: true,
        correctStreak: true,
        nextReviewAt: true,
        wrongActive: true,
        wrongRecoveryRemaining: true
      }
    });
  }

  async listResultStateRows(userId: number, wordIds: number[]) {
    if (wordIds.length === 0) return [];
    return prisma.resultState.findMany({
      where: { userId, wordId: { in: wordIds } },
      select: {
        wordId: true,
        everCorrect: true,
        everWrong: true,
        lastResult: true,
        updatedAt: true
      }
    });
  }

  async countScopeWords(userId: number, scope: "half" | null): Promise<number> {
    if (scope === "half") {
      return prisma.resultState.count({ where: { userId, everCorrect: true, everWrong: true } });
    }
    return prisma.word.count();
  }

  async listResultStateWordIdsForMode(userId: number, mode: "listCorrect" | "listWrong" | "listHalf") {
    const where =
      mode === "listHalf"
        ? { userId, everCorrect: true, everWrong: true }
        : mode === "listCorrect"
          ? { userId, lastResult: LastResult.CORRECT }
          : { userId, lastResult: LastResult.WRONG };
    const states = await prisma.resultState.findMany({
      where,
      orderBy: { wordId: "asc" },
      select: { wordId: true }
    });
    return states.map((state) => state.wordId);
  }

  async listExistingNormalizedEn(normalizedEns: string[]) {
    if (normalizedEns.length === 0) return [];
    const rows = await prisma.$queryRaw<Array<{ normalized: string }>>`
      SELECT DISTINCT lower(trim(regexp_replace(replace(replace(w."en", '-', ' '), '_', ' '), '\\s+', ' ', 'g'))) AS normalized
      FROM "Word" w
      WHERE lower(trim(regexp_replace(replace(replace(w."en", '-', ' '), '_', ' '), '\\s+', ' ', 'g'))) IN (${Prisma.join(normalizedEns)})
    `;
    return rows.map((row) => row.normalized);
  }

  async createWordsBulk(rows: Array<{ en: string; ko: string }>): Promise<number> {
    if (rows.length === 0) return 0;
    const result = await prisma.word.createMany({
      data: rows,
      skipDuplicates: true
    });
    return result.count;
  }

  async updateWordKo(id: number, ko: string) {
    return prisma.word.update({
      where: { id },
      data: { ko },
      select: { id: true, en: true, ko: true }
    });
  }

  getPrismaClient(): PrismaClient {
    return prisma;
  }
}
