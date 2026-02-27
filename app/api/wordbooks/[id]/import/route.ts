import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { getWordbookEditPlanGuardError, requireOwnedWordbook } from "@/lib/api/wordbook-guards";
import { normalizeTermForKey } from "@/lib/clipper";
import { parseWordbookText } from "@/lib/wordbookIo";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { bumpWordbookVersion } from "@/lib/wordbookVersion";
import { z } from "zod";

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
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { id: idRaw } = await ctx.params;
  const wordbookId = parsePositiveIntParam(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const owned = await requireOwnedWordbook(user, wordbookId);
  if (!owned.ok) return owned.response;
  const editGuard = getWordbookEditPlanGuardError(user, owned.wordbook);
  if (editGuard) return editGuard;

  const parsedBody = await parseJsonWithSchema(req, importWordbookSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const rawText = parsedBody.data.rawText;
  const format = parsedBody.data.format === "csv" ? "csv" : "tsv";
  const fillPronunciation = parsedBody.data.fillPronunciation === true;
  const replaceAll = parsedBody.data.replaceAll === true;

  const parsed = parseWordbookText({ rawText, format, fillPronunciation });
  if (parsed.length === 0) {
    return NextResponse.json({ error: "유효한 행이 없습니다. 깨진 텍스트 또는 빈 값을 확인해주세요." }, { status: 400 });
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
        meaningKo: row.meaning,
        normalizedTerm: normalizeTermForKey(row.term),
        pronunciation: row.pronunciation ?? null,
        example: row.example ?? null,
        exampleMeaning: row.exampleMeaning ?? null,
        exampleSentenceEn: row.example ?? null,
        exampleSentenceKo: row.exampleMeaning ?? null,
        exampleSource: row.example ? "SOURCE" : "NONE",
        enrichmentStatus: "DONE",
        enrichmentCompletedAt: new Date(),
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
