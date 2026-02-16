import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { parseWordbookText } from "@/lib/wordbookIo";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { bumpWordbookVersion } from "@/lib/wordbookVersion";
import { z } from "zod";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

const importWordbookSchema = z.object({
  rawText: z.string().min(1).max(1_000_000),
  format: z.enum(["tsv", "csv"]).optional(),
  fillPronunciation: z.boolean().optional(),
  replaceAll: z.boolean().optional()
});

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

  const parsedBody = await parseJsonWithSchema(req, importWordbookSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const rawText = parsedBody.data.rawText;
  const format = parsedBody.data.format === "csv" ? "csv" : "tsv";
  const fillPronunciation = parsedBody.data.fillPronunciation === true;
  const replaceAll = parsedBody.data.replaceAll === true;

  const parsed = parseWordbookText({ rawText, format, fillPronunciation });
  if (parsed.length === 0) {
    return NextResponse.json({ error: "No valid rows." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    let removed = 0;
    if (replaceAll) {
      removed = await tx.wordbookItem.count({ where: { wordbookId } });
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
    await bumpWordbookVersion(tx, wordbookId, {
      addedCount: parsed.length,
      deletedCount: removed
    });
  });

  return NextResponse.json({ ok: true, importedCount: parsed.length }, { status: 201 });
}
