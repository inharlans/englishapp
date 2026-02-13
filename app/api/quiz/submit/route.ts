import { LastResult } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
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
  try {
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
      include: { progress: true, resultState: true }
    });

    if (!word || !word.progress || !word.resultState) {
      return NextResponse.json({ error: "Word not found." }, { status: 404 });
    }

    if (body.scope === "half" && !(word.resultState.everCorrect && word.resultState.everWrong)) {
      return NextResponse.json({ error: "Word is not eligible for half scope." }, { status: 400 });
    }

    await ensureQuizProgressTable(prisma);
    const modeProgress = await getQuizProgressByWordId(prisma, wordId);

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
          everWrong: word.resultState.everWrong,
          lastResult: LastResult.CORRECT
        }
      : {
          everCorrect: word.resultState.everCorrect,
          everWrong: true,
          lastResult: LastResult.WRONG
        };

    const [progress, resultState] = await prisma.$transaction([
      prisma.progress.update({
        where: { wordId },
        data: progressUpdate
      }),
      prisma.resultState.update({
        where: { wordId },
        data: resultStateUpdate
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
