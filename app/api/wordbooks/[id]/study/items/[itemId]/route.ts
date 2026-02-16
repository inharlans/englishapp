import { LastResult } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

type Body = { result?: "CORRECT" | "WRONG" | "RESET" };

async function syncWordbookStudyState(userId: number, wordbookId: number) {
  const states = await prisma.wordbookStudyItemState.findMany({
    where: { userId, wordbookId },
    select: { status: true }
  });
  const studiedCount = states.length;
  const correctCount = states.filter((s) => s.status === "CORRECT").length;
  const wrongCount = states.filter((s) => s.status === "WRONG").length;

  return prisma.wordbookStudyState.upsert({
    where: { userId_wordbookId: { userId, wordbookId } },
    create: { userId, wordbookId, studiedCount, correctCount, wrongCount },
    update: { studiedCount, correctCount, wrongCount },
    select: { studiedCount: true, correctCount: true, wrongCount: true, updatedAt: true }
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; itemId: string }> }
) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookStudyWrite:${ip}`,
    limit: 120,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

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

  const allowed = await canAccessWordbookForStudy({ userId: user.id, wordbookId });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const item = await prisma.wordbookItem.findFirst({
    where: { id: itemId, wordbookId },
    select: { id: true }
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const result = body?.result;
  if (result !== "CORRECT" && result !== "WRONG" && result !== "RESET") {
    return NextResponse.json({ error: "result must be CORRECT | WRONG | RESET." }, { status: 400 });
  }

  if (result === "RESET") {
    await prisma.wordbookStudyItemState.deleteMany({
      where: { userId: user.id, wordbookId, itemId }
    });
    const studyState = await syncWordbookStudyState(user.id, wordbookId);
    return NextResponse.json({ ok: true, itemState: null, studyState }, { status: 200 });
  }

  const existing = await prisma.wordbookStudyItemState.findUnique({
    where: { userId_wordbookId_itemId: { userId: user.id, wordbookId, itemId } },
    select: { streak: true }
  });
  const streak = result === "CORRECT" ? (existing?.streak ?? 0) + 1 : 0;
  const lastResult = result === "CORRECT" ? LastResult.CORRECT : LastResult.WRONG;

  await prisma.wordbookStudyState.upsert({
    where: { userId_wordbookId: { userId: user.id, wordbookId } },
    create: { userId: user.id, wordbookId },
    update: {}
  });

  const itemState = await prisma.wordbookStudyItemState.upsert({
    where: { userId_wordbookId_itemId: { userId: user.id, wordbookId, itemId } },
    create: {
      userId: user.id,
      wordbookId,
      itemId,
      status: result,
      streak,
      lastResult
    },
    update: {
      status: result,
      streak,
      lastResult
    },
    select: { itemId: true, status: true, streak: true, lastResult: true, updatedAt: true }
  });

  const studyState = await syncWordbookStudyState(user.id, wordbookId);
  return NextResponse.json({ ok: true, itemState, studyState }, { status: 200 });
}
