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

const newItemSchema = z.object({
  term: z.string().trim().min(1).max(300),
  meaning: z.string().trim().min(1).max(1000),
  pronunciation: z.string().trim().max(120).nullable().optional(),
  example: z.string().trim().max(1000).nullable().optional(),
  exampleMeaning: z.string().trim().max(1000).nullable().optional()
});

const addItemsSchema = z.object({
  items: z.array(newItemSchema).min(1).max(1000)
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = await assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const id = parsePositiveIntParam(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const owned = await requireOwnedWordbook(user, id);
  if (!owned.ok) return owned.response;
  const editGuard = getWordbookEditPlanGuardError(user, owned.wordbook);
  if (editGuard) return editGuard;

  const parsedBody = await parseJsonWithSchema(req, addItemsSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const items = parsedBody.data.items;

  const cleaned = items
    .map((it) => ({
      term: (it.term ?? "").trim(),
      meaning: (it.meaning ?? "").trim(),
      pronunciation: it.pronunciation ? String(it.pronunciation).trim() : null,
      example: it.example ? String(it.example).trim() : null,
      exampleMeaning: it.exampleMeaning ? String(it.exampleMeaning).trim() : null
    }))
    .filter((it) => it.term && it.meaning)
    .filter((it) => !isBrokenUserText(it.meaning) && !isBrokenUserText(it.exampleMeaning));

  if (cleaned.length === 0) {
    return NextResponse.json({ error: "유효한 항목이 없습니다. 의미/예문 뜻 텍스트를 확인해 주세요." }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const max = await tx.wordbookItem.aggregate({
      where: { wordbookId: id },
      _max: { position: true }
    });
    const start = (max._max.position ?? -1) + 1;
    await tx.wordbookItem.createMany({
      data: cleaned.map((it, idx) => ({
        wordbookId: id,
        term: it.term,
        meaning: it.meaning,
        meaningKo: it.meaning,
        normalizedTerm: normalizeTermForKey(it.term),
        pronunciation: it.pronunciation,
        example: it.example,
        exampleMeaning: it.exampleMeaning,
        exampleSentenceEn: it.example,
        exampleSentenceKo: it.exampleMeaning,
        exampleSource: it.example ? "SOURCE" : "NONE",
        enrichmentStatus: "DONE",
        enrichmentCompletedAt: new Date(),
        position: start + idx
      }))
    });
    await bumpWordbookVersion(tx, id, { addedCount: cleaned.length });

    return tx.wordbookItem.findMany({
      where: { wordbookId: id },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: {
        id: true,
        term: true,
        meaning: true,
        pronunciation: true,
        example: true,
        exampleMeaning: true,
        position: true
      }
    });
  });

  return NextResponse.json({ items: created }, { status: 201 });
}
