import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { normalizeEn, normalizeKo } from "@/lib/text";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function getMeaningCandidates(value: string): string[] {
  const normalizedWhole = normalizeKo(value);
  const candidates = new Set<string>();
  if (normalizedWhole) {
    candidates.add(normalizedWhole);
  }
  for (const part of value.split(/[,:;\/|]+/g)) {
    const normalizedPart = normalizeKo(part);
    if (normalizedPart) {
      candidates.add(normalizedPart);
    }
  }
  return [...candidates];
}

type Body = {
  itemId?: number;
  mode?: "MEANING" | "WORD";
  answer?: string;
};

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
    update: { studiedCount, correctCount, wrongCount }
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookQuizSubmit:${ip}`,
    limit: 120,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { id: idRaw } = await ctx.params;
  const wordbookId = parseId(idRaw);
  if (!wordbookId) {
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

  const body = (await req.json().catch(() => null)) as Body | null;
  const itemId = Number(body?.itemId);
  const mode = body?.mode === "WORD" ? "WORD" : "MEANING";
  const answer = (body?.answer ?? "").trim();
  if (!Number.isFinite(itemId) || itemId <= 0 || !answer) {
    return NextResponse.json({ error: "itemId and answer are required." }, { status: 400 });
  }

  const item = await prisma.wordbookItem.findFirst({
    where: { id: Math.floor(itemId), wordbookId },
    select: { id: true, term: true, meaning: true }
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const correct =
    mode === "WORD"
      ? normalizeEn(answer) === normalizeEn(item.term)
      : getMeaningCandidates(answer).some((c) => getMeaningCandidates(item.meaning).includes(c));

  const existing = await prisma.wordbookStudyItemState.findUnique({
    where: { userId_wordbookId_itemId: { userId: user.id, wordbookId, itemId: item.id } },
    select: { streak: true }
  });
  const streak = correct ? (existing?.streak ?? 0) + 1 : 0;
  await prisma.wordbookStudyState.upsert({
    where: { userId_wordbookId: { userId: user.id, wordbookId } },
    create: { userId: user.id, wordbookId },
    update: {}
  });
  await prisma.wordbookStudyItemState.upsert({
    where: { userId_wordbookId_itemId: { userId: user.id, wordbookId, itemId: item.id } },
    create: {
      userId: user.id,
      wordbookId,
      itemId: item.id,
      status: correct ? "CORRECT" : "WRONG",
      streak,
      lastResult: correct ? "CORRECT" : "WRONG"
    },
    update: {
      status: correct ? "CORRECT" : "WRONG",
      streak,
      lastResult: correct ? "CORRECT" : "WRONG"
    }
  });
  await syncWordbookStudyState(user.id, wordbookId);

  return NextResponse.json(
    {
      correct,
      correctAnswer: { term: item.term, meaning: item.meaning }
    },
    { status: 200 }
  );
}
