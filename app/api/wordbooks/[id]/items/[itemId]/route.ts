import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { getWordbookEditPlanGuardError, requireOwnedWordbook } from "@/lib/api/wordbook-guards";
import { normalizeTermForKey } from "@/lib/clipper";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { isBrokenUserText } from "@/lib/textQuality";
import { parseJsonWithSchema } from "@/lib/validation";
import { bumpWordbookVersion } from "@/lib/wordbookVersion";
import { z } from "zod";

const patchItemSchema = z
  .object({
    term: z.string().trim().min(1).max(300).optional(),
    meaning: z.string().trim().min(1).max(1000).optional(),
    pronunciation: z.string().trim().max(120).nullable().optional(),
    example: z.string().trim().max(1000).nullable().optional(),
    exampleMeaning: z.string().trim().max(1000).nullable().optional(),
    position: z.number().int().nonnegative().optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; itemId: string }> }
) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw, itemId: itemIdRaw } = await ctx.params;
  const wordbookId = parsePositiveIntParam(idRaw);
  const itemId = parsePositiveIntParam(itemIdRaw);
  if (!wordbookId || !itemId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const owned = await requireOwnedWordbook(user, wordbookId);
  if (!owned.ok) return owned.response;
  const editGuard = getWordbookEditPlanGuardError(user, owned.wordbook);
  if (editGuard) return editGuard;

  const parsedBody = await parseJsonWithSchema(req, patchItemSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  if (typeof body.meaning === "string" && isBrokenUserText(body.meaning)) {
    return NextResponse.json({ error: "의미 텍스트가 올바르지 않습니다." }, { status: 400 });
  }
  if (typeof body.exampleMeaning === "string" && isBrokenUserText(body.exampleMeaning)) {
    return NextResponse.json({ error: "예문 뜻 텍스트가 올바르지 않습니다." }, { status: 400 });
  }

  const data: {
    term?: string;
    meaning?: string;
    pronunciation?: string | null;
    example?: string | null;
    exampleMeaning?: string | null;
    position?: number;
  } = {};

  if ("term" in body && typeof body.term === "string") {
    data.term = body.term.trim();
    (data as { normalizedTerm?: string }).normalizedTerm = normalizeTermForKey(body.term.trim());
  }
  if ("meaning" in body && typeof body.meaning === "string") {
    data.meaning = body.meaning.trim();
    (data as { meaningKo?: string }).meaningKo = body.meaning.trim();
  }
  if ("pronunciation" in body) {
    data.pronunciation = body.pronunciation ? String(body.pronunciation).trim() : null;
  }
  if ("example" in body) {
    data.example = body.example ? String(body.example).trim() : null;
    (data as { exampleSentenceEn?: string | null }).exampleSentenceEn = body.example ? String(body.example).trim() : null;
    (data as { exampleSource?: "SOURCE" | "NONE" }).exampleSource = body.example ? "SOURCE" : "NONE";
  }
  if ("exampleMeaning" in body) {
    data.exampleMeaning = body.exampleMeaning ? String(body.exampleMeaning).trim() : null;
    (data as { exampleSentenceKo?: string | null }).exampleSentenceKo = body.exampleMeaning ? String(body.exampleMeaning).trim() : null;
  }
  if (typeof body.position === "number" && Number.isFinite(body.position)) {
    data.position = Math.max(0, Math.floor(body.position));
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.wordbookItem.update({
      where: { id: itemId, wordbookId },
      data,
      select: {
        id: true,
        term: true,
        meaning: true,
        pronunciation: true,
        example: true,
        exampleMeaning: true,
        meaningKo: true,
        exampleSentenceEn: true,
        exampleSentenceKo: true,
        exampleSource: true,
        partOfSpeech: true,
        position: true
      }
    });
    await bumpWordbookVersion(tx, wordbookId, { updatedCount: 1 });
    return next;
  });

  return NextResponse.json({ item: updated }, { status: 200 });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; itemId: string }> }
) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw, itemId: itemIdRaw } = await ctx.params;
  const wordbookId = parsePositiveIntParam(idRaw);
  const itemId = parsePositiveIntParam(itemIdRaw);
  if (!wordbookId || !itemId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const owned = await requireOwnedWordbook(user, wordbookId);
  if (!owned.ok) return owned.response;
  const editGuard = getWordbookEditPlanGuardError(user, owned.wordbook);
  if (editGuard) return editGuard;

  await prisma.$transaction(async (tx) => {
    await tx.wordbookItem.delete({ where: { id: itemId, wordbookId } });
    await bumpWordbookVersion(tx, wordbookId, { deletedCount: 1 });
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}
