import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { normalizeTermForKey } from "@/lib/clipper";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { isBrokenUserText } from "@/lib/textQuality";
import { parseJsonWithSchema } from "@/lib/validation";
import { isPrivateWordbookLockedForFree } from "@/lib/wordbookAccess";
import { bumpWordbookVersion } from "@/lib/wordbookVersion";
import { getEffectivePlan } from "@/lib/userPlan";
import { z } from "zod";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

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
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wordbook = await prisma.wordbook.findUnique({
    where: { id },
    select: { ownerId: true, isPublic: true }
  });
  if (!wordbook) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (wordbook.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (
    isPrivateWordbookLockedForFree({
      plan: getEffectivePlan({ plan: user.plan, proUntil: user.proUntil }),
      isOwner: true,
      isPublic: wordbook.isPublic
    })
  ) {
    return NextResponse.json(
      { error: "무료 요금제에서는 비공개 단어장을 수정할 수 없습니다. 공개 전환 또는 업그레이드가 필요합니다." },
      { status: 403 }
    );
  }

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
