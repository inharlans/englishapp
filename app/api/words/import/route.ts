import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { normalizeEn, parseWords } from "@/lib/text";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

const importRequestSchema = z.object({
  rawText: z.string().min(1).max(1_000_000)
});

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordsImport:${ip}`,
    limit: 10,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const parsedBody = await parseJsonWithSchema(req, importRequestSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const rawText = parsedBody.data.rawText;

    const parsed = parseWords(rawText);
    if (parsed.rows.length === 0) {
      return NextResponse.json({
        importedCount: 0,
        skippedCount: 0,
        delimiter: parsed.delimiter,
        message: "No valid rows found."
      });
    }

    const existing = await prisma.word.findMany({ select: { en: true } });
    const existingNormalized = new Set(existing.map((w) => normalizeEn(w.en)));

    let importedCount = 0;
    let skippedCount = 0;
    for (const row of parsed.rows) {
      if (existingNormalized.has(normalizeEn(row.en))) {
        skippedCount += 1;
        continue;
      }
      const created = await prisma.word.create({
        data: { en: row.en, ko: row.ko },
        select: { en: true }
      });
      existingNormalized.add(normalizeEn(created.en));
      importedCount += 1;
    }

    return NextResponse.json({ importedCount, skippedCount, delimiter: parsed.delimiter });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error during word import." },
      { status: 400 }
    );
  }
}
