import { LastResult } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { invalidateStudyPartStatsCacheForWordbook } from "@/lib/studyPartStatsCache";
import { parseJsonWithSchema } from "@/lib/validation";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";
import { z } from "zod";

const studyItemBodySchema = z.object({
  result: z.enum(["CORRECT", "WRONG", "RESET"])
});

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
  const wordbookId = parsePositiveIntParam(idRaw);
  const itemId = parsePositiveIntParam(itemIdRaw);
  if (!wordbookId || !itemId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

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

  const parsedBody = await parseJsonWithSchema(req, studyItemBodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const result = parsedBody.data.result;

  if (result === "RESET") {
    await prisma.wordbookStudyItemState.deleteMany({
      where: { userId: user.id, wordbookId, itemId }
    });
    invalidateStudyPartStatsCacheForWordbook(user.id, wordbookId);
    const studyState = await syncWordbookStudyState(user.id, wordbookId);
    return NextResponse.json({ ok: true, itemState: null, studyState }, { status: 200 });
  }

  const existing = await prisma.wordbookStudyItemState.findUnique({
    where: { userId_wordbookId_itemId: { userId: user.id, wordbookId, itemId } },
    select: { streak: true, everCorrect: true, everWrong: true }
  });
  const streak = result === "CORRECT" ? (existing?.streak ?? 0) + 1 : 0;
  const lastResult = result === "CORRECT" ? LastResult.CORRECT : LastResult.WRONG;
  const everCorrect = (existing?.everCorrect ?? false) || result === "CORRECT";
  const everWrong = (existing?.everWrong ?? false) || result === "WRONG";

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
      everCorrect,
      everWrong,
      lastResult
    },
    update: {
      status: result,
      streak,
      everCorrect,
      everWrong,
      lastResult
    },
    select: {
      itemId: true,
      status: true,
      streak: true,
      everCorrect: true,
      everWrong: true,
      lastResult: true,
      updatedAt: true
    }
  });

  invalidateStudyPartStatsCacheForWordbook(user.id, wordbookId);
  const studyState = await syncWordbookStudyState(user.id, wordbookId);
  return NextResponse.json({ ok: true, itemState, studyState }, { status: 200 });
}
