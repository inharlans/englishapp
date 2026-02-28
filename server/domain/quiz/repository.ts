import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { QuizItemRow, QuizMode } from "@/server/domain/quiz/contracts";

export class QuizRepository {
  async countWordbookItems(wordbookId: number): Promise<number> {
    return prisma.wordbookItem.count({ where: { wordbookId } });
  }

  async getQuestionCount(userId: number, wordbookId: number, mode: QuizMode): Promise<number> {
    const state = await prisma.wordbookStudyState.findUnique({
      where: { userId_wordbookId: { userId, wordbookId } },
      select: { meaningQuestionCount: true, wordQuestionCount: true }
    });
    return mode === "MEANING" ? (state?.meaningQuestionCount ?? 0) : (state?.wordQuestionCount ?? 0);
  }

  async pickRandomItem(input: {
    wordbookId: number;
    userId: number;
    partStart: number;
    partEndExclusive: number;
    filterSql: Prisma.Sql;
  }): Promise<QuizItemRow | null> {
    const countRows = await prisma.$queryRaw<Array<{ count: number }>>(
      Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM "WordbookItem" wi
        LEFT JOIN "WordbookStudyItemState" ws
          ON ws."itemId" = wi."id"
         AND ws."wordbookId" = wi."wordbookId"
         AND ws."userId" = ${input.userId}
        WHERE wi."wordbookId" = ${input.wordbookId}
          AND wi."position" >= ${input.partStart}
          AND wi."position" < ${input.partEndExclusive}
          AND (${input.filterSql})
      `
    );

    const count = countRows[0]?.count ?? 0;
    if (count <= 0) return null;

    const offset = Math.floor(Math.random() * count);
    const rows = await prisma.$queryRaw<QuizItemRow[]>(
      Prisma.sql`
        SELECT
          wi."id",
          wi."term",
          wi."meaning",
          wi."example",
          wi."exampleMeaning"
        FROM "WordbookItem" wi
        LEFT JOIN "WordbookStudyItemState" ws
          ON ws."itemId" = wi."id"
         AND ws."wordbookId" = wi."wordbookId"
         AND ws."userId" = ${input.userId}
        WHERE wi."wordbookId" = ${input.wordbookId}
          AND wi."position" >= ${input.partStart}
          AND wi."position" < ${input.partEndExclusive}
          AND (${input.filterSql})
        ORDER BY wi."position" ASC, wi."id" ASC
        OFFSET ${offset}
        LIMIT 1
      `
    );
    return rows[0] ?? null;
  }

  async findWordbookItem(wordbookId: number, itemId: number) {
    return prisma.wordbookItem.findFirst({
      where: { id: itemId, wordbookId },
      select: { id: true, term: true, meaning: true }
    });
  }

  async getStudyItemState(userId: number, wordbookId: number, itemId: number) {
    return prisma.wordbookStudyItemState.findUnique({
      where: { userId_wordbookId_itemId: { userId, wordbookId, itemId } },
      select: {
        status: true,
        streak: true,
        everCorrect: true,
        everWrong: true,
        meaningCorrectStreak: true,
        wordCorrectStreak: true
      }
    });
  }

  async upsertStudyStateAndIncrementQuestion(input: {
    userId: number;
    wordbookId: number;
    mode: QuizMode;
  }) {
    return prisma.wordbookStudyState.upsert({
      where: { userId_wordbookId: { userId: input.userId, wordbookId: input.wordbookId } },
      create: {
        userId: input.userId,
        wordbookId: input.wordbookId,
        meaningQuestionCount: input.mode === "MEANING" ? 1 : 0,
        wordQuestionCount: input.mode === "WORD" ? 1 : 0
      },
      update: {
        ...(input.mode === "MEANING"
          ? { meaningQuestionCount: { increment: 1 } }
          : { wordQuestionCount: { increment: 1 } })
      },
      select: { meaningQuestionCount: true, wordQuestionCount: true }
    });
  }

  async upsertStudyItemState(input: {
    userId: number;
    wordbookId: number;
    itemId: number;
    nextStatus: "CORRECT" | "WRONG";
    streak: number;
    mode: QuizMode;
    modeNextStreak: number;
    modeNextReviewAt: Date | null;
    modeWrongRequeueAt: number | null;
    everCorrect: boolean;
    everWrong: boolean;
    lastResult: "CORRECT" | "WRONG";
  }) {
    await prisma.wordbookStudyItemState.upsert({
      where: { userId_wordbookId_itemId: { userId: input.userId, wordbookId: input.wordbookId, itemId: input.itemId } },
      create: {
        userId: input.userId,
        wordbookId: input.wordbookId,
        itemId: input.itemId,
        status: input.nextStatus,
        streak: input.streak,
        meaningCorrectStreak: input.mode === "MEANING" ? input.modeNextStreak : 0,
        meaningNextReviewAt: input.mode === "MEANING" ? input.modeNextReviewAt : null,
        meaningWrongRequeueAt: input.mode === "MEANING" ? input.modeWrongRequeueAt : null,
        wordCorrectStreak: input.mode === "WORD" ? input.modeNextStreak : 0,
        wordNextReviewAt: input.mode === "WORD" ? input.modeNextReviewAt : null,
        wordWrongRequeueAt: input.mode === "WORD" ? input.modeWrongRequeueAt : null,
        everCorrect: input.everCorrect,
        everWrong: input.everWrong,
        lastResult: input.lastResult
      },
      update: {
        status: input.nextStatus,
        streak: input.streak,
        ...(input.mode === "MEANING"
          ? {
              meaningCorrectStreak: input.modeNextStreak,
              meaningNextReviewAt: input.modeNextReviewAt,
              meaningWrongRequeueAt: input.modeWrongRequeueAt
            }
          : {
              wordCorrectStreak: input.modeNextStreak,
              wordNextReviewAt: input.modeNextReviewAt,
              wordWrongRequeueAt: input.modeWrongRequeueAt
            }),
        everCorrect: input.everCorrect,
        everWrong: input.everWrong,
        lastResult: input.lastResult
      }
    });
  }

  async updateStudyStateCountsIfNeeded(input: {
    userId: number;
    wordbookId: number;
    studiedDelta: number;
    correctDelta: number;
    wrongDelta: number;
  }) {
    if (input.studiedDelta === 0 && input.correctDelta === 0 && input.wrongDelta === 0) return;
    await prisma.wordbookStudyState.update({
      where: { userId_wordbookId: { userId: input.userId, wordbookId: input.wordbookId } },
      data: {
        ...(input.studiedDelta !== 0 ? { studiedCount: { increment: input.studiedDelta } } : {}),
        ...(input.correctDelta !== 0 ? { correctCount: { increment: input.correctDelta } } : {}),
        ...(input.wrongDelta !== 0 ? { wrongCount: { increment: input.wrongDelta } } : {})
      }
    });
  }

  async findLegacyWord(wordId: number) {
    return prisma.word.findUnique({
      where: { id: wordId },
      select: { id: true, en: true, ko: true }
    });
  }

  async findLegacyResultState(userId: number, wordId: number) {
    return prisma.resultState.findUnique({
      where: { userId_wordId: { userId, wordId } },
      select: { everCorrect: true, everWrong: true, lastResult: true }
    });
  }

  async upsertLegacyProgressAndResultState(input: {
    userId: number;
    wordId: number;
    correctStreak: number;
    nextReviewAt: Date | null;
    everCorrect: boolean;
    everWrong: boolean;
    lastResult: "CORRECT" | "WRONG";
  }) {
    return prisma.$transaction([
      prisma.progress.upsert({
        where: { userId_wordId: { userId: input.userId, wordId: input.wordId } },
        update: {
          correctStreak: input.correctStreak,
          nextReviewAt: input.nextReviewAt,
          wrongActive: false,
          wrongRecoveryRemaining: 0
        },
        create: {
          userId: input.userId,
          wordId: input.wordId,
          correctStreak: input.correctStreak,
          nextReviewAt: input.nextReviewAt,
          wrongActive: false,
          wrongRecoveryRemaining: 0
        }
      }),
      prisma.resultState.upsert({
        where: { userId_wordId: { userId: input.userId, wordId: input.wordId } },
        update: {
          everCorrect: input.everCorrect,
          everWrong: input.everWrong,
          lastResult: input.lastResult
        },
        create: {
          userId: input.userId,
          wordId: input.wordId,
          everCorrect: input.everCorrect,
          everWrong: input.everWrong,
          lastResult: input.lastResult
        }
      })
    ]);
  }
}
