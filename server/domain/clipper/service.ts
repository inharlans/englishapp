import { Prisma } from "@prisma/client";

import {
  CLIPPER_EXAMPLE_MAX_LEN,
  CLIPPER_TERM_MAX_LEN,
  clampLength,
  normalizeTermForKey,
  normalizeWhitespace,
  sanitizeExampleInput,
  sanitizeTermInput
} from "@/lib/clipper";
import { normalizeTerm } from "@/lib/normalizeTerm";
import { prisma } from "@/lib/prisma";

import type { RequestUser } from "@/lib/api/route-helpers";

type AddInput = {
  term: string;
  exampleSentenceEn?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  wordbookId?: number;
};

type CaptureInput = {
  term: string;
  meaning?: string | null;
  context?: string | null;
  sourceUrl?: string;
  sourceTitle?: string;
  wordbookId?: number;
};

const CLIPPER_MEANING_MAX_LEN = 1000;
const CLIPPER_SOURCE_TITLE_MAX_LEN = 300;
const DEFAULT_PERSONAL_WORDBOOK_TITLE = "개인 기본 단어장";
const APOSTROPHE_IN_TERM_RE = /['\u2018\u2019\u02BC]/;
const EDGE_SYMBOL_RE = /(^[\p{S}])|([\p{S}]$)/u;
const NON_ASCII_RE = /[^\x00-\x7F]/;
const PRESERVED_SYMBOL_RE = /[+#&]/;

function shouldAllowLegacyFallback(rawTerm: string): boolean {
  const trimmed = rawTerm.trim();
  if (!trimmed) return false;
  if (PRESERVED_SYMBOL_RE.test(trimmed)) return false;
  if (APOSTROPHE_IN_TERM_RE.test(trimmed)) return true;
  if (NON_ASCII_RE.test(trimmed)) return true;
  return !EDGE_SYMBOL_RE.test(trimmed);
}

function sanitizeOptionalMeaning(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = clampLength(normalizeWhitespace(value), CLIPPER_MEANING_MAX_LEN);
  return cleaned || null;
}

function sanitizeOptionalSourceTitle(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = clampLength(normalizeWhitespace(value), CLIPPER_SOURCE_TITLE_MAX_LEN);
  return cleaned || null;
}

function sanitizeOptionalSourceUrl(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function isMeaningPlaceholder(value: string | null | undefined, term: string): boolean {
  if (isBlank(value)) return true;
  return normalizeWhitespace(value ?? "").toLowerCase() === normalizeWhitespace(term).toLowerCase();
}

function hasSufficientMeaning(value: string | null | undefined, term: string): boolean {
  return !isMeaningPlaceholder(value, term);
}

function resolveTargetStatus(input: {
  existingStatus: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  hasMeaning: boolean;
  hasContext: boolean;
}): "QUEUED" | "PROCESSING" | "DONE" {
  if (input.existingStatus === "DONE") return "DONE";
  if (input.existingStatus === "PROCESSING") return "PROCESSING";
  return input.hasMeaning && input.hasContext ? "DONE" : "QUEUED";
}

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
    const capture = await this.captureWord({
      user: input.user,
      data: {
        term: input.data.term,
        context: input.data.exampleSentenceEn,
        sourceUrl: input.data.sourceUrl,
        sourceTitle: input.data.sourceTitle,
        wordbookId: input.data.wordbookId
      }
    });

    if (!capture.ok) {
      return capture;
    }

    if (capture.payload.status === "created") {
      const created = await prisma.wordbookItem.findUnique({
        where: { id: capture.payload.itemId },
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
        payload: {
          status: "created" as const,
          item: created
        }
      };
    }

    return {
      ok: true as const,
      status: 200,
      payload: {
        status: "duplicate" as const,
        existingItemId: capture.payload.itemId
      }
    };
  }

  async captureWord(input: { user: RequestUser; data: CaptureInput }) {
    const { user, data } = input;

    const term = sanitizeTermInput(data.term);
    const normalizedTerm = normalizeTerm(term);
    const legacyNormalizedTerm = normalizeTermForKey(term);
    if (!normalizedTerm) {
      return { ok: false as const, status: 400, error: "Invalid term." };
    }

    const resolvedWordbook = await this.resolveEffectiveWordbookId({
      userId: user.id,
      requestedWordbookId: data.wordbookId
    });
    if (!resolvedWordbook.ok) {
      return resolvedWordbook;
    }
    const effectiveWordbookId = resolvedWordbook.wordbookId;

    const incomingMeaning = sanitizeOptionalMeaning(data.meaning);
    const incomingContext = data.context ? sanitizeExampleInput(data.context) : null;
    const incomingSourceUrl = sanitizeOptionalSourceUrl(data.sourceUrl);
    const incomingSourceTitle = sanitizeOptionalSourceTitle(data.sourceTitle);

    const createAsDone = hasSufficientMeaning(incomingMeaning, term) && !isBlank(incomingContext);
    const now = new Date();

    const existing = await this.findExistingByNormalizedTerms({
      wordbookId: effectiveWordbookId,
      normalizedTerm,
      legacyNormalizedTerm,
      rawTerm: term
    });

    if (existing) {
      const merged = await this.mergeExistingDuplicateById({
        itemId: existing.id,
        incoming: {
          term,
          meaning: incomingMeaning,
          context: incomingContext,
          sourceUrl: incomingSourceUrl,
          sourceTitle: incomingSourceTitle
        }
      });

      if (!merged) {
        return { ok: false as const, status: 409, error: "동일한 단어가 이미 존재합니다." };
      }

      return {
        ok: true as const,
        status: 200,
        payload: {
          status: "merged" as const,
          itemId: merged.id,
          wordbookId: merged.wordbookId,
          enrichmentStatus: merged.enrichmentStatus
        }
      };
    }

    const buildCreateData = () => ({
      wordbookId: effectiveWordbookId,
      term,
      normalizedTerm,
      meaning: incomingMeaning ?? term,
      meaningKo: null,
      partOfSpeech: null,
      pronunciation: null,
      example: incomingContext,
      exampleMeaning: null,
      exampleSentenceEn: incomingContext,
      exampleSentenceKo: null,
      exampleSource: incomingContext ? "SOURCE" : "NONE",
      enrichmentStatus: createAsDone ? "DONE" : "QUEUED",
      enrichmentQueuedAt: now,
      enrichmentStartedAt: null,
      enrichmentCompletedAt: createAsDone ? now : null,
      enrichmentError: null,
      sourceUrl: incomingSourceUrl,
      sourceTitle: incomingSourceTitle
    } satisfies Prisma.WordbookItemUncheckedCreateInput);

    try {
      const created = await prisma.wordbookItem.create({
        data: buildCreateData(),
        select: { id: true, wordbookId: true, enrichmentStatus: true }
      });

      return {
        ok: true as const,
        status: 201,
        payload: {
          status: "created" as const,
          itemId: created.id,
          wordbookId: created.wordbookId,
          enrichmentStatus: created.enrichmentStatus
        }
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raceExisting = await this.findExistingByNormalizedTerms({
          wordbookId: effectiveWordbookId,
          normalizedTerm,
          legacyNormalizedTerm,
          rawTerm: term
        });

        if (!raceExisting) {
          return { ok: false as const, status: 409, error: "동일한 단어가 이미 존재합니다." };
        }

        const merged = await this.mergeExistingDuplicateById({
          itemId: raceExisting.id,
          incoming: {
            term,
            meaning: incomingMeaning,
            context: incomingContext,
            sourceUrl: incomingSourceUrl,
            sourceTitle: incomingSourceTitle
          }
        });

        if (!merged) {
          return { ok: false as const, status: 409, error: "동일한 단어가 이미 존재합니다." };
        }

        return {
          ok: true as const,
          status: 200,
          payload: {
            status: "merged" as const,
            itemId: merged.id,
            wordbookId: merged.wordbookId,
            enrichmentStatus: merged.enrichmentStatus
          }
        };
      }
      throw error;
    }
  }

  private async findExistingByNormalizedTerms(input: {
    wordbookId: number;
    normalizedTerm: string;
    legacyNormalizedTerm: string;
    rawTerm: string;
  }): Promise<{ id: number } | null> {
    const exact = await prisma.wordbookItem.findFirst({
      where: {
        wordbookId: input.wordbookId,
        normalizedTerm: input.normalizedTerm
      },
      select: { id: true }
    });
    if (exact) return exact;

    if (!input.legacyNormalizedTerm || input.legacyNormalizedTerm === input.normalizedTerm) {
      return null;
    }

    if (!shouldAllowLegacyFallback(input.rawTerm)) {
      return null;
    }

    return prisma.wordbookItem.findFirst({
      where: {
        wordbookId: input.wordbookId,
        normalizedTerm: input.legacyNormalizedTerm
      },
      select: { id: true }
    });
  }

  private async resolveEffectiveWordbookId(input: {
    userId: number;
    requestedWordbookId?: number;
  }): Promise<{ ok: true; wordbookId: number } | { ok: false; status: number; error: string }> {
    if (input.requestedWordbookId) {
      const owned = await prisma.wordbook.findFirst({
        where: { id: input.requestedWordbookId, ownerId: input.userId },
        select: { id: true }
      });
      if (!owned) {
        return { ok: false as const, status: 403, error: "Forbidden." };
      }
      return { ok: true as const, wordbookId: owned.id };
    }

    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${input.userId}
        FOR UPDATE
      `);

      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { defaultWordbookId: true }
      });

      const defaultWordbookId = user?.defaultWordbookId ?? null;
      if (defaultWordbookId) {
        const ownedDefault = await tx.wordbook.findFirst({
          where: { id: defaultWordbookId, ownerId: input.userId },
          select: { id: true }
        });
        if (ownedDefault) {
          return { ok: true as const, wordbookId: ownedDefault.id };
        }
      }

      const existingOwned = await tx.wordbook.findFirst({
        where: { ownerId: input.userId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true }
      });

      if (existingOwned) {
        await tx.user.update({
          where: { id: input.userId },
          data: { defaultWordbookId: existingOwned.id }
        });
        return { ok: true as const, wordbookId: existingOwned.id };
      }

      const created = await tx.wordbook.create({
        data: {
          ownerId: input.userId,
          title: DEFAULT_PERSONAL_WORDBOOK_TITLE,
          description: null,
          fromLang: "en",
          toLang: "ko",
          isPublic: false
        },
        select: { id: true }
      });

      const claim = await tx.user.updateMany({
        where: { id: input.userId, defaultWordbookId: null },
        data: { defaultWordbookId: created.id }
      });

      if (claim.count !== 1) {
        const latestUser = await tx.user.findUnique({
          where: { id: input.userId },
          select: { defaultWordbookId: true }
        });
        const latestDefaultWordbookId = latestUser?.defaultWordbookId ?? null;
        if (latestDefaultWordbookId) {
          await tx.wordbook.delete({ where: { id: created.id } });
          return { ok: true as const, wordbookId: latestDefaultWordbookId };
        }

        await tx.user.update({
          where: { id: input.userId },
          data: { defaultWordbookId: created.id }
        });
      }

      return { ok: true as const, wordbookId: created.id };
    });
  }

  private async mergeExistingDuplicateById(input: {
    itemId: number;
    incoming: {
      term: string;
      meaning: string | null;
      context: string | null;
      sourceUrl: string | null;
      sourceTitle: string | null;
    };
  }): Promise<{ id: number; wordbookId: number; enrichmentStatus: "QUEUED" | "PROCESSING" | "DONE" | "FAILED" } | null> {
    const existing = await prisma.wordbookItem.findUnique({
      where: { id: input.itemId },
      select: {
        id: true,
        wordbookId: true,
        term: true,
        meaning: true,
        example: true,
        exampleSentenceEn: true,
        sourceUrl: true,
        sourceTitle: true,
        exampleSource: true,
        enrichmentStatus: true,
        enrichmentCompletedAt: true
      }
    });

    if (!existing) return null;

    const nextMeaning = isMeaningPlaceholder(existing.meaning, existing.term)
      ? (input.incoming.meaning ?? existing.meaning)
      : existing.meaning;

    const nextExampleSentenceEn = isBlank(existing.exampleSentenceEn)
      ? (input.incoming.context ?? existing.exampleSentenceEn)
      : existing.exampleSentenceEn;

    const nextExample = isBlank(existing.example)
      ? (input.incoming.context ?? existing.example)
      : existing.example;

    const nextSourceUrl = isBlank(existing.sourceUrl)
      ? (input.incoming.sourceUrl ?? existing.sourceUrl)
      : existing.sourceUrl;

    const nextSourceTitle = isBlank(existing.sourceTitle)
      ? (input.incoming.sourceTitle ?? existing.sourceTitle)
      : existing.sourceTitle;

    const hasMeaning = hasSufficientMeaning(nextMeaning, existing.term);
    const hasContext = !isBlank(nextExampleSentenceEn);
    const nextEnrichmentStatus = resolveTargetStatus({
      existingStatus: existing.enrichmentStatus,
      hasMeaning,
      hasContext
    });
    const isTransitioningToDone = existing.enrichmentStatus !== "DONE" && nextEnrichmentStatus === "DONE";
    const completedAtValue =
      nextEnrichmentStatus === "DONE"
        ? (isTransitioningToDone ? new Date() : existing.enrichmentCompletedAt)
        : (nextEnrichmentStatus === "PROCESSING" ? undefined : null);
    const shouldClearFailureMetadata = nextEnrichmentStatus === "DONE";

    const updated = await prisma.wordbookItem.update({
      where: { id: existing.id },
      data: {
        meaning: nextMeaning,
        example: nextExample,
        exampleSentenceEn: nextExampleSentenceEn,
        sourceUrl: nextSourceUrl,
        sourceTitle: nextSourceTitle,
        exampleSource: nextExampleSentenceEn ? "SOURCE" : existing.exampleSource,
        enrichmentStatus: nextEnrichmentStatus,
        enrichmentCompletedAt: completedAtValue,
        enrichmentError: shouldClearFailureMetadata ? null : undefined
      },
      select: {
        id: true,
        wordbookId: true,
        enrichmentStatus: true
      }
    });

    return updated;
  }
}

export const clipperAddSchema = {
  CLIPPER_TERM_MAX_LEN,
  CLIPPER_EXAMPLE_MAX_LEN,
  CLIPPER_MEANING_MAX_LEN,
  CLIPPER_SOURCE_TITLE_MAX_LEN
};
