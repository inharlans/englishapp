import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { getMemorizeMetaById } from "@/lib/memorizeMeta";
import { prisma } from "@/lib/prisma";
import { ensureQuizProgressTable, getQuizProgressMap } from "@/lib/quizProgress";
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

function mapByWordId<T extends { wordId: number }>(rows: T[]): Map<number, T> {
  return new Map(rows.map((row) => [row.wordId, row]));
}

async function getWordIdsForScope(
  userId: number,
  scope: "half" | null,
  opts?: { skip?: number; take?: number }
) {
  if (scope !== "half") {
    const words = await prisma.word.findMany({
      orderBy: { id: "asc" },
      skip: opts?.skip,
      take: opts?.take,
      select: { id: true }
    });
    return words.map((w) => w.id);
  }

  const rows = await prisma.resultState.findMany({
    where: { userId, everCorrect: true, everWrong: true },
    orderBy: { wordId: "asc" },
    skip: opts?.skip,
    take: opts?.take,
    select: { wordId: true }
  });
  return rows.map((row) => row.wordId);
}

async function getWordsByIds(wordIds: number[]) {
  if (wordIds.length === 0) return [];
  return prisma.word.findMany({
    where: { id: { in: wordIds } },
    orderBy: { id: "asc" },
    select: { id: true, en: true, ko: true }
  });
}

async function getStateMaps(userId: number, wordIds: number[]) {
  if (wordIds.length === 0) {
    return {
      progressMap: new Map(),
      resultStateMap: new Map()
    };
  }

  const [progressRows, resultStateRows] = await Promise.all([
    prisma.progress.findMany({
      where: { userId, wordId: { in: wordIds } },
      select: {
        wordId: true,
        correctStreak: true,
        nextReviewAt: true,
        wrongActive: true,
        wrongRecoveryRemaining: true
      }
    }),
    prisma.resultState.findMany({
      where: { userId, wordId: { in: wordIds } },
      select: {
        wordId: true,
        everCorrect: true,
        everWrong: true,
        lastResult: true,
        updatedAt: true
      }
    })
  ]);

  return {
    progressMap: mapByWordId(progressRows),
    resultStateMap: mapByWordId(resultStateRows)
  };
}

function attachState(
  words: Array<{ id: number; en: string; ko: string }>,
  maps: {
    progressMap: Map<
      number,
      {
        wordId: number;
        correctStreak: number;
        nextReviewAt: Date | null;
        wrongActive: boolean;
        wrongRecoveryRemaining: number;
      }
    >;
    resultStateMap: Map<
      number,
      {
        wordId: number;
        everCorrect: boolean;
        everWrong: boolean;
        lastResult: LastResult | null;
        updatedAt: Date;
      }
    >;
  }
): WordWithState[] {
  return words.map((word) => {
    const progress = maps.progressMap.get(word.id) ?? null;
    const resultState = maps.resultStateMap.get(word.id) ?? null;
    return {
      ...word,
      progress: progress
        ? {
            correctStreak: progress.correctStreak,
            nextReviewAt: progress.nextReviewAt,
            wrongActive: progress.wrongActive,
            wrongRecoveryRemaining: progress.wrongRecoveryRemaining
          }
        : null,
      resultState: resultState
        ? {
            everCorrect: resultState.everCorrect,
            everWrong: resultState.everWrong,
            lastResult: resultState.lastResult,
            updatedAt: resultState.updatedAt
          }
        : null
    };
  });
}

export async function GET(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
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

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
  const scopeType = scope === "half" ? "half" : null;

  const scopeCount =
    scopeType === "half"
      ? await prisma.resultState.count({
          where: { userId: user.id, everCorrect: true, everWrong: true }
        })
      : await prisma.word.count();

  const maxWeek = Math.max(Math.ceil(scopeCount / 50), 1);
  const safeWeek =
    Number.isFinite(week) && week >= 1 ? Math.min(Math.floor(week), maxWeek) : 1;

  const weekWordIds = await getWordIdsForScope(user.id, scopeType, {
    skip: (safeWeek - 1) * 50,
    take: 50
  });
  const weekWords = await getWordsByIds(weekWordIds);
  const weekItems = attachState(weekWords, await getStateMaps(user.id, weekWordIds));

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
      return NextResponse.json({ word: null, maxWeek, isUserScoped: true });
    }

    const metaMap = await getMemorizeMetaById([selected.id]);
    const meta = metaMap.get(selected.id);

    return NextResponse.json({
      word: {
        ...selected,
        memorizeWeek: meta?.memorizeWeek,
        memorizePosition: meta?.memorizePosition
      },
      maxWeek,
      isUserScoped: true
    });
  }

  if (mode === "listCorrect" || mode === "listWrong" || mode === "listHalf") {
    const where =
      mode === "listHalf"
        ? { userId: user.id, everCorrect: true, everWrong: true }
        : mode === "listCorrect"
          ? { userId: user.id, lastResult: LastResult.CORRECT }
          : { userId: user.id, lastResult: LastResult.WRONG };

    const states = await prisma.resultState.findMany({
      where,
      orderBy: { wordId: "asc" },
      select: { wordId: true }
    });
    const ids = states.map((s) => s.wordId);
    const words = await getWordsByIds(ids);
    const maps = await getStateMaps(user.id, ids);
    const metaMap = await getMemorizeMetaById(words.map((w) => w.id));

    return NextResponse.json({
      words: attachState(words, maps).map((item) => ({
        ...item,
        memorizeWeek: metaMap.get(item.id)?.memorizeWeek,
        memorizePosition: metaMap.get(item.id)?.memorizePosition
      })),
      total: words.length,
      page: 0,
      batch: words.length || 1,
      maxWeek,
      isUserScoped: true
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
        user.id,
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
    words: items.map((item) => ({
      ...item,
      memorizeWeek: metaMap.get(item.id)?.memorizeWeek,
      memorizePosition: metaMap.get(item.id)?.memorizePosition
    })),
    total: filtered.length,
    page: safePage,
    batch: safeBatch,
    maxWeek,
    isUserScoped: true
  });
}
