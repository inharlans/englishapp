import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { CLIPPER_EXAMPLE_MAX_LEN, CLIPPER_TERM_MAX_LEN, normalizeTermForKey, sanitizeExampleInput, sanitizeTermInput } from "@/lib/clipper";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";

const bodySchema = z.object({
  term: z.string().trim().min(1).max(CLIPPER_TERM_MAX_LEN),
  exampleSentenceEn: z.string().trim().max(CLIPPER_EXAMPLE_MAX_LEN).optional(),
  sourceUrl: z.string().trim().url().max(2000).optional(),
  sourceTitle: z.string().trim().max(300).optional(),
  wordbookId: z.number().int().positive().optional()
});

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) {
    await recordApiMetricFromStart({
      route: "/api/clipper/add",
      method: "POST",
      status: badReq.status,
      startedAt
    });
    return badReq;
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    await recordApiMetricFromStart({
      route: "/api/clipper/add",
      method: "POST",
      status: 401,
      startedAt
    });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let parsedInput: z.infer<typeof bodySchema> | null = null;
  let effectiveWordbookIdForError: number | null = null;

  try {
    const parsed = await parseJsonWithSchema(req, bodySchema);
    if (!parsed.ok) {
      await recordApiMetricFromStart({
        route: "/api/clipper/add",
        method: "POST",
        status: parsed.response.status,
        startedAt,
        userId: user.id
      });
      return parsed.response;
    }

    parsedInput = parsed.data;
    const term = sanitizeTermInput(parsed.data.term);
    const normalizedTerm = normalizeTermForKey(term);
    if (!normalizedTerm) {
      await recordApiMetricFromStart({
        route: "/api/clipper/add",
        method: "POST",
        status: 400,
        startedAt,
        userId: user.id
      });
      return NextResponse.json({ error: "Invalid term." }, { status: 400 });
    }

    const selectedWordbookId = parsed.data.wordbookId;
    const userRow = await prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultWordbookId: true }
    });
    const effectiveWordbookId = selectedWordbookId ?? userRow?.defaultWordbookId ?? null;
    effectiveWordbookIdForError = effectiveWordbookId;
    if (!effectiveWordbookId) {
      await recordApiMetricFromStart({
        route: "/api/clipper/add",
        method: "POST",
        status: 422,
        startedAt,
        userId: user.id
      });
      return NextResponse.json({ error: "기본 단어장이 설정되지 않았습니다." }, { status: 422 });
    }

    const wordbook = await prisma.wordbook.findFirst({
      where: { id: effectiveWordbookId, ownerId: user.id },
      select: { id: true }
    });
    if (!wordbook) {
      await recordApiMetricFromStart({
        route: "/api/clipper/add",
        method: "POST",
        status: 403,
        startedAt,
        userId: user.id
      });
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const exampleSentenceEn = parsed.data.exampleSentenceEn ? sanitizeExampleInput(parsed.data.exampleSentenceEn) : null;
    const sourceUrl = parsed.data.sourceUrl ? parsed.data.sourceUrl.trim() : null;
    const sourceTitle = parsed.data.sourceTitle ? parsed.data.sourceTitle.trim() : null;

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

    await recordApiMetricFromStart({
      route: "/api/clipper/add",
      method: "POST",
      status: 201,
      startedAt,
      userId: user.id
    });
    return NextResponse.json({ status: "created", item: created }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const normalizedTerm = parsedInput ? normalizeTermForKey(sanitizeTermInput(parsedInput.term)) : null;
      if (normalizedTerm && effectiveWordbookIdForError) {
        const existing = await prisma.wordbookItem.findFirst({
          where: { wordbookId: effectiveWordbookIdForError, normalizedTerm },
          select: { id: true }
        });
        await recordApiMetricFromStart({
          route: "/api/clipper/add",
          method: "POST",
          status: 200,
          startedAt,
          userId: user.id
        });
        return NextResponse.json({ status: "duplicate", existingItemId: existing?.id ?? 0 }, { status: 200 });
      }
      await recordApiMetricFromStart({
        route: "/api/clipper/add",
        method: "POST",
        status: 409,
        startedAt,
        userId: user.id
      });
      return NextResponse.json({ status: "duplicate", existingItemId: 0 }, { status: 200 });
    }

    await captureAppError({
      route: "/api/clipper/add",
      message: "clipper_add_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) },
      userId: user.id
    });
    await recordApiMetricFromStart({
      route: "/api/clipper/add",
      method: "POST",
      status: 500,
      startedAt,
      userId: user.id
    });
    return NextResponse.json({ error: "클리퍼 저장에 실패했습니다." }, { status: 500 });
  }
}
