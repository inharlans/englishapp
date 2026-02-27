import { LastResult } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { invalidateStudyPartStatsCacheForWordbook } from "@/lib/studyPartStatsCache";

export class WordbookStudyItemService {
  private async syncWordbookStudyState(userId: number, wordbookId: number) {
    const states = await prisma.wordbookStudyItemState.findMany({
      where: { userId, wordbookId },
      select: { status: true }
    });
    const studiedCount = states.length;
    const correctCount = states.filter((s) => s.status === "CORRECT").length;
    const wrongCount = states.filter((s) => s.status === "WRONG").length;

    return prisma.wordbookStudyState.upsert({
      where: { userId_wordbookId: { userId, wordbookId } },
      create: { userId, wordbookId, studiedCount, correctCount, wrongCount },
      update: { studiedCount, correctCount, wrongCount },
      select: { studiedCount: true, correctCount: true, wrongCount: true, updatedAt: true }
    });
  }

  async submitResult(input: {
    userId: number;
    wordbookId: number;
    itemId: number;
    result: "CORRECT" | "WRONG" | "RESET";
  }) {
    const { userId, wordbookId, itemId, result } = input;

    const item = await prisma.wordbookItem.findFirst({
      where: { id: itemId, wordbookId },
      select: { id: true }
    });
    if (!item) {
      return { ok: false as const, status: 404, error: "Item not found." };
    }

    if (result === "RESET") {
      await prisma.wordbookStudyItemState.deleteMany({
        where: { userId, wordbookId, itemId }
      });
      invalidateStudyPartStatsCacheForWordbook(userId, wordbookId);
      const studyState = await this.syncWordbookStudyState(userId, wordbookId);
      return { ok: true as const, payload: { ok: true, itemState: null, studyState } };
    }

    const existing = await prisma.wordbookStudyItemState.findUnique({
      where: { userId_wordbookId_itemId: { userId, wordbookId, itemId } },
      select: { streak: true, everCorrect: true, everWrong: true }
    });
    const streak = result === "CORRECT" ? (existing?.streak ?? 0) + 1 : 0;
    const lastResult = result === "CORRECT" ? LastResult.CORRECT : LastResult.WRONG;
    const everCorrect = (existing?.everCorrect ?? false) || result === "CORRECT";
    const everWrong = (existing?.everWrong ?? false) || result === "WRONG";

    await prisma.wordbookStudyState.upsert({
      where: { userId_wordbookId: { userId, wordbookId } },
      create: { userId, wordbookId },
      update: {}
    });

    const itemState = await prisma.wordbookStudyItemState.upsert({
      where: { userId_wordbookId_itemId: { userId, wordbookId, itemId } },
      create: {
        userId,
        wordbookId,
        itemId,
        status: result,
        streak,
        everCorrect,
        everWrong,
        lastResult
      },
      update: {
        status: result,
        streak,
        everCorrect,
        everWrong,
        lastResult
      },
      select: {
        itemId: true,
        status: true,
        streak: true,
        everCorrect: true,
        everWrong: true,
        lastResult: true,
        updatedAt: true
      }
    });

    invalidateStudyPartStatsCacheForWordbook(userId, wordbookId);
    const studyState = await this.syncWordbookStudyState(userId, wordbookId);
    return { ok: true as const, payload: { ok: true, itemState, studyState } };
  }
}
