import { Prisma } from "@prisma/client";

import {
  CLIPPER_EXAMPLE_MAX_LEN,
  CLIPPER_TERM_MAX_LEN,
  normalizeTermForKey,
  sanitizeExampleInput,
  sanitizeTermInput
} from "@/lib/clipper";
import { prisma } from "@/lib/prisma";

import type { RequestUser } from "@/lib/api/route-helpers";

type AddInput = {
  term: string;
  exampleSentenceEn?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  wordbookId?: number;
};

export class ClipperService {
  async getSettings(user: RequestUser) {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultWordbookId: true }
    });
    return {
      ok: true as const,
      status: 200,
      payload: {
        defaultWordbookId: row?.defaultWordbookId ?? null
      }
    };
  }

  async updateSettings(user: RequestUser, defaultWordbookId: number | null) {
    if (defaultWordbookId !== null) {
      const owned = await prisma.wordbook.findFirst({
        where: { id: defaultWordbookId, ownerId: user.id },
        select: { id: true }
      });
      if (!owned) {
        return { ok: false as const, status: 403, error: "Forbidden." };
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultWordbookId }
    });

    return {
      ok: true as const,
      status: 200,
      payload: { ok: true, defaultWordbookId }
    };
  }

  async addWord(input: { user: RequestUser; data: AddInput }) {
    const { user, data } = input;

    const term = sanitizeTermInput(data.term);
    const normalizedTerm = normalizeTermForKey(term);
    if (!normalizedTerm) {
      return { ok: false as const, status: 400, error: "Invalid term." };
    }

    const selectedWordbookId = data.wordbookId;
    const userRow = await prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultWordbookId: true }
    });
    const effectiveWordbookId = selectedWordbookId ?? userRow?.defaultWordbookId ?? null;
    if (!effectiveWordbookId) {
      return { ok: false as const, status: 422, error: "기본 단어장이 설정되지 않았습니다." };
    }

    const wordbook = await prisma.wordbook.findFirst({
      where: { id: effectiveWordbookId, ownerId: user.id },
      select: { id: true }
    });
    if (!wordbook) {
      return { ok: false as const, status: 403, error: "Forbidden." };
    }

    const exampleSentenceEn = data.exampleSentenceEn ? sanitizeExampleInput(data.exampleSentenceEn) : null;
    const sourceUrl = data.sourceUrl ? data.sourceUrl.trim() : null;
    const sourceTitle = data.sourceTitle ? data.sourceTitle.trim() : null;

    try {
      const created = await prisma.wordbookItem.create({
        data: {
          wordbookId: effectiveWordbookId,
          term,
          normalizedTerm,
          meaning: term,
          meaningKo: null,
          partOfSpeech: null,
          pronunciation: null,
          example: exampleSentenceEn,
          exampleMeaning: null,
          exampleSentenceEn,
          exampleSentenceKo: null,
          exampleSource: exampleSentenceEn ? "SOURCE" : "NONE",
          enrichmentStatus: "QUEUED",
          enrichmentQueuedAt: new Date(),
          enrichmentStartedAt: null,
          enrichmentCompletedAt: null,
          sourceUrl,
          sourceTitle
        },
        select: {
          id: true,
          wordbookId: true,
          term: true,
          meaningKo: true,
          partOfSpeech: true,
          exampleSentenceEn: true,
          exampleSentenceKo: true,
          exampleSource: true,
          enrichmentStatus: true,
          enrichmentQueuedAt: true
        }
      });

      return {
        ok: true as const,
        status: 201,
        payload: { status: "created", item: created }
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.wordbookItem.findFirst({
          where: { wordbookId: effectiveWordbookId, normalizedTerm },
          select: { id: true }
        });
        return {
          ok: true as const,
          status: 200,
          payload: { status: "duplicate", existingItemId: existing?.id ?? 0 }
        };
      }
      throw error;
    }
  }
}

export const clipperAddSchema = {
  CLIPPER_TERM_MAX_LEN,
  CLIPPER_EXAMPLE_MAX_LEN
};
