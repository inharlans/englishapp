import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ensureQuizProgressTable, getQuizProgressMap } from "@/lib/quizProgress";
import { getMemorizeMetaById } from "@/lib/memorizeMeta";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { ensureWordsSeeded } from "@/lib/seedWords";
import type { ApiMode, QuizType } from "@/lib/types";
import { LastResult } from "@prisma/client";

type WordWithState = {
  id: number;
  en: string;
  ko: string;
  memorizeWeek?: number;
  memorizePosition?: number;
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
  const ip = getClientIpFromHeaders(req.headers);
  const limit = checkRateLimit({
    key: `wordsGet:${ip}`,
    limit: 240,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  await ensureWordsSeeded();

  const { searchParams } = new URL(req.url);
  const mode = parseMode(searchParams.get("mode"));
  const page = Number(searchParams.get("page") ?? "0");
  const batch = Number(searchParams.get("batch") ?? `${DEFAULT_BATCH}`);
  const hideCorrect = (searchParams.get("hideCorrect") ?? "true") !== "false";
  const week = Number(searchParams.get("week") ?? "1");
  const scope = searchParams.get("scope");
  const forQuiz = searchParams.get("forQuiz") === "true";
  const quizTypeRaw = searchParams.get("quizType");
  const quizType: QuizType | null =
    quizTypeRaw === "MEANING" || quizTypeRaw === "WORD" ? quizTypeRaw : null;

  const now = new Date();

  const scopeWhere = scope === "half"
    ? { resultState: { is: { everCorrect: true, everWrong: true } } }
    : undefined;
  const scopeCount = await prisma.word.count({ where: scopeWhere });
  const maxWeek = Math.max(Math.ceil(scopeCount / 50), 1);
  const safeWeek =
    Number.isFinite(week) && week >= 1 ? Math.min(Math.floor(week), maxWeek) : 1;

  const weekItems = await prisma.word.findMany({
    where: scopeWhere,
    include: { progress: true, resultState: true },
    orderBy: { id: "asc" },
    skip: (safeWeek - 1) * 50,
    take: 50
  });

  if (mode === "quiz") {
    const priority2 = weekItems.filter((w) => {
      const reviewAt = w.progress?.nextReviewAt;
      return reviewAt !== null && reviewAt !== undefined && reviewAt <= now;
    });
    const priority3 = weekItems.filter((w) => (w.progress?.correctStreak ?? 0) === 0);

    const candidatePool =
      priority2.length > 0 ? priority2 : priority3.length > 0 ? priority3 : weekItems;
    const selected =
      candidatePool.length > 0
        ? candidatePool[Math.floor(Math.random() * candidatePool.length)]
        : null;

    if (!selected) {
      return NextResponse.json({ word: null, maxWeek });
    }

    const metaMap = await getMemorizeMetaById([selected.id]);
    const meta = metaMap.get(selected.id);
    return NextResponse.json({
      word: {
        ...selected,
        memorizeWeek: meta?.memorizeWeek,
        memorizePosition: meta?.memorizePosition
      },
      maxWeek
    });
  }

  if (mode === "listCorrect" || mode === "listWrong" || mode === "listHalf") {
    const where =
      mode === "listHalf"
        ? scopeWhere
        : mode === "listCorrect"
          ? {
              ...(scopeWhere ?? {}),
              resultState: { is: { lastResult: LastResult.CORRECT } }
            }
          : {
              ...(scopeWhere ?? {}),
              resultState: { is: { lastResult: LastResult.WRONG } }
            };

    const words = await prisma.word.findMany({
      where,
      include: { progress: true, resultState: true },
      orderBy: { id: "asc" }
    });

    const metaMap = await getMemorizeMetaById(words.map((w) => w.id));
    return NextResponse.json({
      words: words.map((item) => {
        const meta = metaMap.get(item.id);
        return {
          ...item,
          memorizeWeek: meta?.memorizeWeek,
          memorizePosition: meta?.memorizePosition
        };
      }),
      total: words.length,
      page: 0,
      batch: words.length || 1,
      maxWeek
    });
  }

  let filtered: WordWithState[] = weekItems;

  if (mode === "memorize") {
    filtered = hideCorrect
      ? weekItems.filter((w) => (w.progress?.correctStreak ?? 0) < 1)
      : weekItems;

    if (forQuiz && quizType) {
      await ensureQuizProgressTable(prisma);
      const progressMap = await getQuizProgressMap(
        prisma,
        filtered.map((word) => word.id)
      );

      const parseDate = (value: Date | string | null | undefined) => {
        if (!value) {
          return null;
        }
        return value instanceof Date ? value : new Date(value);
      };

      filtered = filtered.filter((w) => {
        const modeProgress = progressMap.get(w.id);
        if (quizType === "MEANING") {
          const streak = modeProgress?.meaningCorrectStreak ?? 0;
          const reviewAt = parseDate(modeProgress?.meaningNextReviewAt);
          return streak <= 0 || reviewAt === null || reviewAt <= now;
        }
        const streak = modeProgress?.wordCorrectStreak ?? 0;
        const reviewAt = parseDate(modeProgress?.wordNextReviewAt);
        return streak <= 0 || reviewAt === null || reviewAt <= now;
      });
    }
  }

  const safeBatch =
    mode === "memorize"
      ? Math.min(Math.max(Number.isFinite(batch) ? Math.floor(batch) : DEFAULT_BATCH, 1), 50)
      : batch === 5 || batch === 50
        ? batch
        : 1;
  const safePage = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
  const start = safePage * safeBatch;
  const items = filtered.slice(start, start + safeBatch);

  const metaMap = await getMemorizeMetaById(items.map((w) => w.id));

  return NextResponse.json({
    words: items.map((item) => {
      const meta = metaMap.get(item.id);
      return {
        ...item,
        memorizeWeek: meta?.memorizeWeek,
        memorizePosition: meta?.memorizePosition
      };
    }),
    total: filtered.length,
    page: safePage,
    batch: safeBatch,
    maxWeek
  });
}
