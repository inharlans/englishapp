import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { parseWordbookText } from "@/lib/wordbookIo";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

type Body = {
  rawText?: string;
  format?: "tsv" | "csv";
  fillPronunciation?: boolean;
  replaceAll?: boolean;
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookImport:${ip}`,
    limit: 15,
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
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const wordbook = await prisma.wordbook.findUnique({
    where: { id: wordbookId },
    select: { id: true, ownerId: true }
  });
  if (!wordbook) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (wordbook.ownerId !== user.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const rawText = body?.rawText ?? "";
  const format = body?.format === "csv" ? "csv" : "tsv";
  const fillPronunciation = body?.fillPronunciation === true;
  const replaceAll = body?.replaceAll === true;
  if (!rawText.trim()) {
    return NextResponse.json({ error: "rawText is required." }, { status: 400 });
  }
  if (rawText.length > 1_000_000) {
    return NextResponse.json({ error: "rawText is too large." }, { status: 413 });
  }

  const parsed = parseWordbookText({ rawText, format, fillPronunciation });
  if (parsed.length === 0) {
    return NextResponse.json({ error: "No valid rows." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (replaceAll) {
      await tx.wordbookItem.deleteMany({ where: { wordbookId } });
    }

    const max = await tx.wordbookItem.aggregate({
      where: { wordbookId },
      _max: { position: true }
    });
    const start = (max._max.position ?? -1) + 1;
    await tx.wordbookItem.createMany({
      data: parsed.map((row, idx) => ({
        wordbookId,
        term: row.term,
        meaning: row.meaning,
        pronunciation: row.pronunciation ?? null,
        example: row.example ?? null,
        exampleMeaning: row.exampleMeaning ?? null,
        position: start + idx
      }))
    });
  });

  return NextResponse.json({ ok: true, importedCount: parsed.length }, { status: 201 });
}
