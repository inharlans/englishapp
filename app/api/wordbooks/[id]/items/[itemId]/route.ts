import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { isPrivateWordbookLockedForFree } from "@/lib/wordbookAccess";
import { bumpWordbookVersion } from "@/lib/wordbookVersion";
import { getEffectivePlan } from "@/lib/userPlan";
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

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; itemId: string }> }
) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw, itemId: itemIdRaw } = await ctx.params;
  const wordbookId = parseId(idRaw);
  const itemId = parseId(itemIdRaw);
  if (!wordbookId || !itemId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wordbook = await prisma.wordbook.findUnique({
    where: { id: wordbookId },
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

  const parsedBody = await parseJsonWithSchema(req, patchItemSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const data: {
    term?: string;
    meaning?: string;
    pronunciation?: string | null;
    example?: string | null;
    exampleMeaning?: string | null;
    position?: number;
  } = {};

  if ("term" in body && typeof body.term === "string") {
    const t = body.term.trim();
    data.term = t;
  }
  if ("meaning" in body && typeof body.meaning === "string") {
    const m = body.meaning.trim();
    data.meaning = m;
  }
  if ("pronunciation" in body) {
    data.pronunciation = body.pronunciation ? String(body.pronunciation).trim() : null;
  }
  if ("example" in body) {
    data.example = body.example ? String(body.example).trim() : null;
  }
  if ("exampleMeaning" in body) {
    data.exampleMeaning = body.exampleMeaning ? String(body.exampleMeaning).trim() : null;
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
  const wordbookId = parseId(idRaw);
  const itemId = parseId(itemIdRaw);
  if (!wordbookId || !itemId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wordbook = await prisma.wordbook.findUnique({
    where: { id: wordbookId },
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

  await prisma.$transaction(async (tx) => {
    await tx.wordbookItem.delete({ where: { id: itemId, wordbookId } });
    await bumpWordbookVersion(tx, wordbookId, { deletedCount: 1 });
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}
