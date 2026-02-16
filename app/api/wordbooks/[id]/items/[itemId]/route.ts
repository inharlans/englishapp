import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

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
    select: { ownerId: true }
  });
  if (!wordbook) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (wordbook.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        term?: string;
        meaning?: string;
        pronunciation?: string | null;
        example?: string | null;
        exampleMeaning?: string | null;
        position?: number;
      }
    | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const data: {
    term?: string;
    meaning?: string;
    pronunciation?: string | null;
    example?: string | null;
    exampleMeaning?: string | null;
    position?: number;
  } = {};

  if (typeof body.term === "string") {
    const t = body.term.trim();
    if (!t) return NextResponse.json({ error: "term cannot be empty." }, { status: 400 });
    data.term = t;
  }
  if (typeof body.meaning === "string") {
    const m = body.meaning.trim();
    if (!m) return NextResponse.json({ error: "meaning cannot be empty." }, { status: 400 });
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

  const updated = await prisma.wordbookItem.update({
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
    select: { ownerId: true }
  });
  if (!wordbook) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (wordbook.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.wordbookItem.delete({ where: { id: itemId, wordbookId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
