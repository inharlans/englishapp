import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { getEffectivePlan } from "@/lib/userPlan";
import { parseJsonWithSchema } from "@/lib/validation";
import { MARKET_MIN_ITEM_COUNT } from "@/lib/wordbookPolicy";
import { z } from "zod";

const publishSchema = z.object({
  isPublic: z.boolean()
});

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

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

  const parsedBody = await parseJsonWithSchema(req, publishSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const effectivePlan = getEffectivePlan({ plan: user.plan, proUntil: user.proUntil });
  if (effectivePlan === "FREE" && body.isPublic === false) {
    return NextResponse.json(
      { error: "Free plan wordbooks must be public." },
      { status: 403 }
    );
  }

  const existing = await prisma.wordbook.findUnique({
    where: { id },
    select: { ownerId: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (body.isPublic) {
    const itemCount = await prisma.wordbookItem.count({ where: { wordbookId: id } });
    if (itemCount < MARKET_MIN_ITEM_COUNT) {
      return NextResponse.json(
        { error: `마켓 공개는 ${MARKET_MIN_ITEM_COUNT}단어 이상부터 가능합니다.` },
        { status: 400 }
      );
    }
  }

  const wordbook = await prisma.wordbook.update({
    where: { id },
    data: { isPublic: body.isPublic },
    select: { id: true, isPublic: true, updatedAt: true }
  });
  return NextResponse.json({ wordbook }, { status: 200 });
}
