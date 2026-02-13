import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ensureWordsSeeded } from "@/lib/seedWords";
import type { ApiMode } from "@/lib/types";

type WordWithState = {
  id: number;
  en: string;
  ko: string;
  progress: {
    correctStreak: number;
    nextReviewAt: Date | null;
    wrongActive: boolean;
    wrongRecoveryRemaining: number;
  } | null;
  resultState: {
    everCorrect: boolean;
    everWrong: boolean;
    lastResult: "CORRECT" | "WRONG" | null;
    updatedAt: Date;
  } | null;
};

const DEFAULT_BATCH = 1;

function parseMode(rawMode: string | null): ApiMode {
  const mode = rawMode ?? "memorize";
  const supported: ApiMode[] = [
    "memorize",
    "quiz",
    "listCorrect",
    "listWrong",
    "listHalf"
  ];
  if (!supported.includes(mode as ApiMode)) {
    return "memorize";
  }
  return mode as ApiMode;
}

export async function GET(req: NextRequest) {
  await ensureWordsSeeded();

  const { searchParams } = new URL(req.url);
  const mode = parseMode(searchParams.get("mode"));
  const page = Number(searchParams.get("page") ?? "0");
  const batch = Number(searchParams.get("batch") ?? `${DEFAULT_BATCH}`);
  const hideCorrect = (searchParams.get("hideCorrect") ?? "true") !== "false";
  const week = Number(searchParams.get("week") ?? "1");
  const scope = searchParams.get("scope");

  const words = await prisma.word.findMany({
    include: {
      progress: true,
      resultState: true
    },
    orderBy: { id: "asc" }
  });

  const now = new Date();
  const byScope =
    scope === "half"
      ? words.filter((w) => w.resultState?.everCorrect && w.resultState?.everWrong)
      : words;

  const byWeek = (() => {
    if (!Number.isFinite(week) || week < 1) {
      return byScope;
    }
    const safeWeek = Math.floor(week);
    const startIndex = (safeWeek - 1) * 50;
    const endIndexExclusive = startIndex + 50;
    return byScope.slice(startIndex, endIndexExclusive);
  })();

  if (mode === "quiz") {
    const priority2 = byWeek.filter((w) => {
      const reviewAt = w.progress?.nextReviewAt;
      return reviewAt !== null && reviewAt !== undefined && reviewAt <= now;
    });
    const priority3 = byWeek.filter((w) => (w.progress?.correctStreak ?? 0) === 0);

    const candidatePool = priority2.length > 0 ? priority2 : priority3.length > 0 ? priority3 : byWeek;
    const selected =
      candidatePool.length > 0
        ? candidatePool[Math.floor(Math.random() * candidatePool.length)]
        : null;
    return NextResponse.json({ word: selected });
  }

  let filtered: WordWithState[] = byScope;

  if (mode === "memorize") {
    filtered = hideCorrect
      ? byWeek.filter((w) => (w.progress?.correctStreak ?? 0) < 1)
      : byWeek;
  }

  if (mode === "listCorrect") {
    filtered = byScope.filter((w) => w.resultState?.lastResult === "CORRECT");
  }

  if (mode === "listWrong") {
    filtered = byScope.filter((w) => w.resultState?.lastResult === "WRONG");
  }

  if (mode === "listHalf") {
    filtered = byScope.filter((w) => w.resultState?.everCorrect && w.resultState?.everWrong);
  }

  if (mode === "listCorrect" || mode === "listWrong" || mode === "listHalf") {
    return NextResponse.json({
      words: filtered,
      total: filtered.length,
      page: 0,
      batch: filtered.length || 1
    });
  }

  const safeBatch = batch === 5 || batch === 50 ? batch : 1;
  const safePage = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
  const start = safePage * safeBatch;
  const items = filtered.slice(start, start + safeBatch);

  return NextResponse.json({
    words: items,
    total: filtered.length,
    page: safePage,
    batch: safeBatch
  });
}
