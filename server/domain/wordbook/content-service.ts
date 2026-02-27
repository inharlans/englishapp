import { normalizeTermForKey } from "@/lib/clipper";
import { MARKET_MIN_ITEM_COUNT } from "@/lib/wordbookPolicy";
import { parseWordbookText, toDelimitedWordbook } from "@/lib/wordbookIo";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/lib/userPlan";
import { bumpWordbookVersion } from "@/lib/wordbookVersion";

import type { RequestUser } from "@/lib/api/route-helpers";

export class WordbookContentService {
  async publishForOwner(input: { user: RequestUser; wordbookId: number; isPublic: boolean }) {
    const { user, wordbookId, isPublic } = input;

    const effectivePlan = getEffectivePlan({ plan: user.plan, proUntil: user.proUntil });
    if (effectivePlan === "FREE" && isPublic === false) {
      return {
        ok: false as const,
        status: 403,
        error: "무료 요금제에서는 단어장을 공개 상태로만 유지할 수 있습니다."
      };
    }

    const existing = await prisma.wordbook.findUnique({
      where: { id: wordbookId },
      select: { ownerId: true }
    });
    if (!existing) {
      return { ok: false as const, status: 404, error: "Not found." };
    }
    if (existing.ownerId !== user.id) {
      return { ok: false as const, status: 403, error: "Forbidden." };
    }

    if (isPublic) {
      const itemCount = await prisma.wordbookItem.count({ where: { wordbookId } });
      if (itemCount < MARKET_MIN_ITEM_COUNT) {
        return {
          ok: false as const,
          status: 400,
          error: `마켓 공개는 ${MARKET_MIN_ITEM_COUNT}단어 이상부터 가능합니다.`
        };
      }
    }

    const wordbook = await prisma.wordbook.update({
      where: { id: wordbookId },
      data: { isPublic },
      select: { id: true, isPublic: true, updatedAt: true }
    });
    return { ok: true as const, wordbook };
  }

  async importForOwner(input: {
    user: RequestUser;
    wordbookId: number;
    rawText: string;
    format: "tsv" | "csv";
    fillPronunciation: boolean;
    replaceAll: boolean;
  }) {
    const { user, wordbookId, rawText, format, fillPronunciation, replaceAll } = input;

    const wordbook = await prisma.wordbook.findUnique({
      where: { id: wordbookId },
      select: { id: true, ownerId: true, isPublic: true }
    });
    if (!wordbook) return { ok: false as const, status: 404, error: "Not found." };
    if (wordbook.ownerId !== user.id) return { ok: false as const, status: 403, error: "Forbidden." };

    const plan = getEffectivePlan({ plan: user.plan, proUntil: user.proUntil });
    if (plan === "FREE" && wordbook.isPublic === false) {
      return {
        ok: false as const,
        status: 403,
        error: "무료 요금제에서는 비공개 단어장을 수정할 수 없습니다. 공개 전환 또는 업그레이드가 필요합니다."
      };
    }

    const parsed = parseWordbookText({ rawText, format, fillPronunciation });
    if (parsed.length === 0) {
      return {
        ok: false as const,
        status: 400,
        error: "유효한 행이 없습니다. 깨진 텍스트 또는 빈 값을 확인해주세요."
      };
    }

    await prisma.$transaction(async (tx) => {
      let removed = 0;
      if (replaceAll) {
        removed = await tx.wordbookItem.count({ where: { wordbookId } });
        await tx.wordbookItem.deleteMany({ where: { wordbookId } });
      }

      const max = await tx.wordbookItem.aggregate({
        where: { wordbookId },
        _max: { position: true }
      });
      const start = (max._max.position ?? -1) + 1;
      await tx.wordbookItem.createMany({
        data: parsed.map((row, idx) => ({
          wordbookId,
          term: row.term,
          meaning: row.meaning,
          meaningKo: row.meaning,
          normalizedTerm: normalizeTermForKey(row.term),
          pronunciation: row.pronunciation ?? null,
          example: row.example ?? null,
          exampleMeaning: row.exampleMeaning ?? null,
          exampleSentenceEn: row.example ?? null,
          exampleSentenceKo: row.exampleMeaning ?? null,
          exampleSource: row.example ? "SOURCE" : "NONE",
          enrichmentStatus: "DONE",
          enrichmentCompletedAt: new Date(),
          position: start + idx
        }))
      });
      await bumpWordbookVersion(tx, wordbookId, {
        addedCount: parsed.length,
        deletedCount: removed
      });
    });

    return { ok: true as const, importedCount: parsed.length };
  }

  async exportForOwner(input: {
    user: RequestUser;
    wordbookId: number;
    format: "tsv" | "csv";
  }) {
    const { user, wordbookId, format } = input;

    const wordbook = await prisma.wordbook.findUnique({
      where: { id: wordbookId },
      select: { id: true, ownerId: true, title: true }
    });
    if (!wordbook) return { ok: false as const, status: 404, error: "Not found." };
    if (wordbook.ownerId !== user.id) return { ok: false as const, status: 403, error: "Forbidden." };

    const items = await prisma.wordbookItem.findMany({
      where: { wordbookId },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: {
        term: true,
        meaning: true,
        pronunciation: true,
        example: true,
        exampleMeaning: true
      }
    });

    const text = toDelimitedWordbook({
      rows: items.map((it) => ({
        term: it.term,
        meaning: it.meaning,
        pronunciation: it.pronunciation,
        example: it.example,
        exampleMeaning: it.exampleMeaning
      })),
      format
    });

    const ext = format === "csv" ? "csv" : "tsv";
    const filename = `${wordbook.title.replace(/[\\/:*?"<>|]/g, "_")}.${ext}`;
    return { ok: true as const, text, filename, format };
  }
}
