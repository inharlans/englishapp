import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { normalizeEn, parseWords } from "@/lib/text";

type ImportRequestBody = {
  rawText?: string;
};

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  const limit = checkRateLimit({
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
    const body = (await req.json()) as ImportRequestBody;
    const rawText = body.rawText ?? "";

    if (!rawText.trim()) {
      return NextResponse.json({ error: "rawText가 비어 있습니다." }, { status: 400 });
    }

    const parsed = parseWords(rawText);
    if (parsed.rows.length === 0) {
      return NextResponse.json({
        importedCount: 0,
        skippedCount: 0,
        delimiter: parsed.delimiter,
        message: "유효한 단어가 없습니다."
      });
    }

    const existing = await prisma.word.findMany({
      select: { en: true }
    });
    const existingNormalized = new Set(existing.map((w) => normalizeEn(w.en)));

    const createdWordIds: number[] = [];
    let skippedCount = 0;

    for (const row of parsed.rows) {
      if (existingNormalized.has(normalizeEn(row.en))) {
        skippedCount += 1;
        continue;
      }

      const created = await prisma.word.create({
        data: {
          en: row.en,
          ko: row.ko
        },
        select: { id: true, en: true }
      });
      existingNormalized.add(normalizeEn(created.en));
      createdWordIds.push(created.id);
    }

    if (createdWordIds.length > 0) {
      await prisma.progress.createMany({
        data: createdWordIds.map((wordId) => ({
          wordId,
          correctStreak: 0,
          wrongActive: false,
          wrongRecoveryRemaining: 0
        }))
      });
      await prisma.resultState.createMany({
        data: createdWordIds.map((wordId) => ({
          wordId,
          everCorrect: false,
          everWrong: false,
          lastResult: null
        }))
      });
    }

    return NextResponse.json({
      importedCount: createdWordIds.length,
      skippedCount,
      delimiter: parsed.delimiter
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "단어 import 중 알 수 없는 오류가 발생했습니다."
      },
      { status: 400 }
    );
  }
}
