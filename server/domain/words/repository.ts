import { LastResult, PrismaClient } from "@prisma/client";

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

  async listAllWordEn() {
    return prisma.word.findMany({ select: { en: true } });
  }

  async createWord(row: { en: string; ko: string }) {
    return prisma.word.create({
      data: row,
      select: { en: true }
    });
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
