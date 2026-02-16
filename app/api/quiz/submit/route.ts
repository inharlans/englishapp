import { LastResult } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import {
  ensureQuizProgressTable,
  getQuizProgressByWordId,
  upsertQuizProgress
} from "@/lib/quizProgress";
import { computeNextReviewAt } from "@/lib/scheduling";
import { normalizeEn, normalizeKo } from "@/lib/text";
import type { QuizType } from "@/lib/types";

type SubmitBody = {
  wordId?: number;
  quizType?: QuizType;
  userAnswer?: string;
  scope?: "half";
};

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

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `quizSubmit:${ip}`,
    limit: 120,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const user = await getUserFromRequestCookies(req.cookies);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as SubmitBody;
    const wordId = body.wordId;
    const quizType = body.quizType;
    const userAnswer = body.userAnswer ?? "";

    if (!wordId || !quizType || (quizType !== "MEANING" && quizType !== "WORD")) {
      return NextResponse.json(
        { error: "wordId, quizType, userAnswer are required." },
        { status: 400 }
      );
    }

    const word = await prisma.word.findUnique({
      where: { id: wordId },
      select: { id: true, en: true, ko: true }
    });
    if (!word) {
      return NextResponse.json({ error: "Word not found." }, { status: 404 });
    }

    const currentResultState = await prisma.resultState.findUnique({
      where: { userId_wordId: { userId: user.id, wordId } },
      select: { everCorrect: true, everWrong: true, lastResult: true }
    });

    if (
      body.scope === "half" &&
      !(currentResultState?.everCorrect === true && currentResultState?.everWrong === true)
    ) {
      return NextResponse.json({ error: "Word is not eligible for half scope." }, { status: 400 });
    }

    await ensureQuizProgressTable(prisma);
    const modeProgress = await getQuizProgressByWordId(prisma, user.id, wordId);

    const meaningAnswerCandidates = getMeaningCandidates(userAnswer);
    const meaningCorrectCandidates = new Set(getMeaningCandidates(word.ko));

    const correct =
      quizType === "WORD"
        ? normalizeEn(userAnswer) === normalizeEn(word.en)
        : meaningAnswerCandidates.some((candidate) => meaningCorrectCandidates.has(candidate));
    const isPartialMeaningCorrect =
      quizType === "MEANING" &&
      correct &&
      meaningCorrectCandidates.size > 1 &&
      ![...meaningCorrectCandidates].every((candidate) =>
        meaningAnswerCandidates.includes(candidate)
      );

    const now = new Date();
    const currentModeStreak =
      quizType === "MEANING"
        ? modeProgress?.meaningCorrectStreak ?? 0
        : modeProgress?.wordCorrectStreak ?? 0;
    const nextModeStreak = currentModeStreak + (correct ? 1 : 0);
    const nextModeReviewAt = correct ? computeNextReviewAt(now, nextModeStreak) : null;
    await upsertQuizProgress(prisma, {
      userId: user.id,
      wordId,
      quizType,
      correct,
      nextStreak: nextModeStreak,
      nextReviewAt: nextModeReviewAt
    });

    const nextMeaningStreak =
      quizType === "MEANING" ? nextModeStreak : modeProgress?.meaningCorrectStreak ?? 0;
    const nextWordStreak = quizType === "WORD" ? nextModeStreak : modeProgress?.wordCorrectStreak ?? 0;
    const commonCorrectStreak = Math.max(nextMeaningStreak, nextWordStreak);

    const progressUpdate = {
      correctStreak: commonCorrectStreak,
      nextReviewAt: nextModeReviewAt,
      wrongActive: false,
      wrongRecoveryRemaining: 0
    };

    const resultStateUpdate = correct
      ? {
          everCorrect: true,
          everWrong: currentResultState?.everWrong ?? false,
          lastResult: LastResult.CORRECT
        }
      : {
          everCorrect: currentResultState?.everCorrect ?? false,
          everWrong: true,
          lastResult: LastResult.WRONG
        };

    const [progress, resultState] = await prisma.$transaction([
      prisma.progress.upsert({
        where: { userId_wordId: { userId: user.id, wordId } },
        update: progressUpdate,
        create: {
          userId: user.id,
          wordId,
          ...progressUpdate
        }
      }),
      prisma.resultState.upsert({
        where: { userId_wordId: { userId: user.id, wordId } },
        update: resultStateUpdate,
        create: {
          userId: user.id,
          wordId,
          ...resultStateUpdate
        }
      })
    ]);

    return NextResponse.json({
      correct,
      partial: isPartialMeaningCorrect,
      correctAnswer: {
        en: word.en,
        ko: word.ko
      },
      progress,
      resultState
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error during quiz submission."
      },
      { status: 400 }
    );
  }
}
