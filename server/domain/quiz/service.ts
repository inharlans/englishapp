import { Prisma } from "@prisma/client";

import { ensureQuizProgressTable, getQuizProgressByWordId, upsertQuizProgress } from "@/lib/quizProgress";
import { prisma } from "@/lib/prisma";
import { computeNextReviewAt } from "@/lib/scheduling";
import { getMeaningCandidates, normalizeEn } from "@/lib/text";
import { invalidateStudyPartStatsCacheForWordbook } from "@/lib/studyPartStatsCache";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";
import type {
  GradingDiagnosis,
  LegacyQuizSubmitInput,
  QuizActor,
  QuizMode,
  QuizQueryInput,
  QuizQueryResponse,
  QuizSubmitInput,
  QuizSubmitResponse
} from "@/server/domain/quiz/contracts";
import { QuizRepository } from "@/server/domain/quiz/repository";

export class QuizService {
  constructor(private readonly repo = new QuizRepository()) {}

  async getWordbookQuizQuestion(actor: QuizActor, wordbookId: number, input: QuizQueryInput): Promise<{
    ok: true;
    payload: QuizQueryResponse;
  } | {
    ok: false;
    status: 403;
    error: string;
  }> {
    const allowed = await canAccessWordbookForStudy({ userId: actor.id, wordbookId });
    if (!allowed) {
      return { ok: false, status: 403, error: "Forbidden." };
    }

    const totalItems = await this.repo.countWordbookItems(wordbookId);
    if (totalItems === 0) {
      return {
        ok: true,
        payload: {
          item: null,
          mode: input.mode,
          totalItems: 0,
          partSize: input.partSize,
          partIndex: 1,
          partCount: 1,
          partItemCount: 0
        }
      };
    }

    const partCount = Math.max(1, Math.ceil(totalItems / input.partSize));
    const partIndex = Math.min(Math.max(input.partIndex, 1), partCount);
    const partStart = (partIndex - 1) * input.partSize;
    const partEndExclusive = partStart + input.partSize;
    const partItemCount = Math.max(0, Math.min(input.partSize, totalItems - partStart));

    const questionCount = await this.repo.getQuestionCount(actor.id, wordbookId, input.mode);
    const now = new Date();

    const dueFilter =
      input.mode === "MEANING"
        ? Prisma.sql`ws."meaningCorrectStreak" > 0 AND ws."meaningNextReviewAt" IS NOT NULL AND ws."meaningNextReviewAt" <= ${now}`
        : Prisma.sql`ws."wordCorrectStreak" > 0 AND ws."wordNextReviewAt" IS NOT NULL AND ws."wordNextReviewAt" <= ${now}`;

    const wrongFlagFilter =
      input.mode === "MEANING"
        ? Prisma.sql`ws."meaningWrongRequeueAt" IS NOT NULL`
        : Prisma.sql`ws."wordWrongRequeueAt" IS NOT NULL`;

    const wrongReadyFilter =
      input.mode === "MEANING"
        ? Prisma.sql`ws."meaningWrongRequeueAt" IS NOT NULL AND ws."meaningWrongRequeueAt" <= ${questionCount}`
        : Prisma.sql`ws."wordWrongRequeueAt" IS NOT NULL AND ws."wordWrongRequeueAt" <= ${questionCount}`;

    const unseen = await this.repo.pickRandomItem({
      wordbookId,
      userId: actor.id,
      partStart,
      partEndExclusive,
      filterSql: Prisma.sql`ws."itemId" IS NULL`
    });

    const due =
      unseen ??
      (await this.repo.pickRandomItem({
        wordbookId,
        userId: actor.id,
        partStart,
        partEndExclusive,
        filterSql: dueFilter
      }));

    const wrongReady =
      unseen || due
        ? null
        : await this.repo.pickRandomItem({
            wordbookId,
            userId: actor.id,
            partStart,
            partEndExclusive,
            filterSql: wrongReadyFilter
          });

    const fallbackNonWrong =
      unseen || due || wrongReady
        ? null
        : await this.repo.pickRandomItem({
            wordbookId,
            userId: actor.id,
            partStart,
            partEndExclusive,
            filterSql: Prisma.sql`ws."itemId" IS NULL OR NOT (${wrongFlagFilter})`
          });

    const wrongAtEnd =
      unseen || due || wrongReady || fallbackNonWrong
        ? null
        : await this.repo.pickRandomItem({
            wordbookId,
            userId: actor.id,
            partStart,
            partEndExclusive,
            filterSql: wrongFlagFilter
          });

    return {
      ok: true,
      payload: {
        item: unseen ?? due ?? wrongReady ?? fallbackNonWrong ?? wrongAtEnd ?? null,
        mode: input.mode,
        totalItems,
        partSize: input.partSize,
        partIndex,
        partCount,
        partItemCount
      }
    };
  }

  async submitWordbookQuizAnswer(actor: QuizActor, wordbookId: number, input: QuizSubmitInput): Promise<{
    ok: true;
    payload: QuizSubmitResponse;
  } | {
    ok: false;
    status: 403 | 404;
    error: string;
  }> {
    const allowed = await canAccessWordbookForStudy({ userId: actor.id, wordbookId });
    if (!allowed) {
      return { ok: false, status: 403, error: "Forbidden." };
    }

    const item = await this.repo.findWordbookItem(wordbookId, input.itemId);
    if (!item) {
      return { ok: false, status: 404, error: "Item not found." };
    }

    const acceptedMeaningAnswers = input.mode === "MEANING" ? getMeaningCandidates(item.meaning) : [];
    const correct =
      input.mode === "WORD"
        ? normalizeEn(input.answer) === normalizeEn(item.term)
        : getMeaningCandidates(input.answer).some((c) => acceptedMeaningAnswers.includes(c));

    const gradingDiagnosis =
      input.mode === "MEANING"
        ? buildMeaningDiagnosis(input.answer, item.meaning)
        : {
            input: input.answer,
            normalizedInput: normalizeEn(input.answer),
            closestAccepted: item.term,
            similarityScore: Number(scoreSimilarity(input.answer, item.term).toFixed(3)),
            potentiallyDisputable: false,
            reason: "단어 모드는 정규화된 완전 일치 기준으로 채점합니다."
          };

    const existing = await this.repo.getStudyItemState(actor.id, wordbookId, item.id);
    const now = new Date();

    const stateRow = await this.repo.upsertStudyStateAndIncrementQuestion({
      userId: actor.id,
      wordbookId,
      mode: input.mode
    });
    const questionCountAfter =
      input.mode === "MEANING" ? stateRow.meaningQuestionCount : stateRow.wordQuestionCount;

    const meaningCurrentStreak = existing?.meaningCorrectStreak ?? 0;
    const wordCurrentStreak = existing?.wordCorrectStreak ?? 0;
    const modeCurrentStreak = input.mode === "MEANING" ? meaningCurrentStreak : wordCurrentStreak;
    const modeNextStreak = correct ? modeCurrentStreak + 1 : 0;
    const modeNextReviewAt = correct ? computeNextReviewAt(now, modeNextStreak) : null;
    const modeWrongRequeueAt = correct ? null : questionCountAfter + 10;
    const nextStatus = correct ? "CORRECT" : "WRONG";

    const streak = correct ? (existing?.streak ?? 0) + 1 : 0;
    const everCorrect = (existing?.everCorrect ?? false) || correct;
    const everWrong = (existing?.everWrong ?? false) || !correct;

    await this.repo.upsertStudyItemState({
      userId: actor.id,
      wordbookId,
      itemId: item.id,
      nextStatus,
      streak,
      mode: input.mode,
      modeNextStreak,
      modeNextReviewAt,
      modeWrongRequeueAt,
      everCorrect,
      everWrong,
      lastResult: correct ? "CORRECT" : "WRONG"
    });

    const previousStatus = existing?.status ?? null;
    const studiedDelta = previousStatus ? 0 : 1;
    const correctDelta = (previousStatus === "CORRECT" ? -1 : 0) + (nextStatus === "CORRECT" ? 1 : 0);
    const wrongDelta = (previousStatus === "WRONG" ? -1 : 0) + (nextStatus === "WRONG" ? 1 : 0);

    await this.repo.updateStudyStateCountsIfNeeded({
      userId: actor.id,
      wordbookId,
      studiedDelta,
      correctDelta,
      wrongDelta
    });

    invalidateStudyPartStatsCacheForWordbook(actor.id, wordbookId);

    return {
      ok: true,
      payload: {
        correct,
        correctAnswer: { term: item.term, meaning: item.meaning },
        acceptedMeaningAnswers: input.mode === "MEANING" ? acceptedMeaningAnswers.slice(0, 8) : undefined,
        gradingDiagnosis
      }
    };
  }

  async submitLegacyQuizAnswer(actor: QuizActor, input: LegacyQuizSubmitInput): Promise<{
    ok: true;
    payload: {
      correct: boolean;
      partial: boolean;
      correctAnswer: { en: string; ko: string };
      progress: unknown;
      resultState: unknown;
    };
  } | {
    ok: false;
    status: 400 | 404;
    error: string;
  }> {
    const word = await this.repo.findLegacyWord(input.wordId);
    if (!word) {
      return { ok: false, status: 404, error: "Word not found." };
    }

    const currentResultState = await this.repo.findLegacyResultState(actor.id, input.wordId);
    if (input.scope === "half" && !(currentResultState?.everCorrect === true && currentResultState?.everWrong === true)) {
      return { ok: false, status: 400, error: "Word is not eligible for half scope." };
    }

    await ensureQuizProgressTable(prisma);
    const modeProgress = await getQuizProgressByWordId(prisma, actor.id, input.wordId);

    const meaningAnswerCandidates = getMeaningCandidates(input.userAnswer);
    const meaningCorrectCandidates = new Set(getMeaningCandidates(word.ko));
    const correct =
      input.quizType === "WORD"
        ? normalizeEn(input.userAnswer) === normalizeEn(word.en)
        : meaningAnswerCandidates.some((candidate) => meaningCorrectCandidates.has(candidate));

    const isPartialMeaningCorrect =
      input.quizType === "MEANING" &&
      correct &&
      meaningCorrectCandidates.size > 1 &&
      ![...meaningCorrectCandidates].every((candidate) => meaningAnswerCandidates.includes(candidate));

    const now = new Date();
    const currentModeStreak =
      input.quizType === "MEANING"
        ? modeProgress?.meaningCorrectStreak ?? 0
        : modeProgress?.wordCorrectStreak ?? 0;
    const nextModeStreak = currentModeStreak + (correct ? 1 : 0);
    const nextModeReviewAt = correct ? computeNextReviewAt(now, nextModeStreak) : null;

    await upsertQuizProgress(prisma, {
      userId: actor.id,
      wordId: input.wordId,
      quizType: input.quizType,
      correct,
      nextStreak: nextModeStreak,
      nextReviewAt: nextModeReviewAt
    });

    const nextMeaningStreak =
      input.quizType === "MEANING" ? nextModeStreak : modeProgress?.meaningCorrectStreak ?? 0;
    const nextWordStreak = input.quizType === "WORD" ? nextModeStreak : modeProgress?.wordCorrectStreak ?? 0;
    const commonCorrectStreak = Math.max(nextMeaningStreak, nextWordStreak);

    const [progress, resultState] = await this.repo.upsertLegacyProgressAndResultState({
      userId: actor.id,
      wordId: input.wordId,
      correctStreak: commonCorrectStreak,
      nextReviewAt: nextModeReviewAt,
      everCorrect: correct ? true : (currentResultState?.everCorrect ?? false),
      everWrong: correct ? (currentResultState?.everWrong ?? false) : true,
      lastResult: correct ? "CORRECT" : "WRONG"
    });

    return {
      ok: true,
      payload: {
        correct,
        partial: isPartialMeaningCorrect,
        correctAnswer: {
          en: word.en,
          ko: word.ko
        },
        progress,
        resultState
      }
    };
  }
}

export function parseQuizMode(raw: string | null): QuizMode {
  return raw === "WORD" ? "WORD" : "MEANING";
}

export function parsePositiveInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function normalizeLoose(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[] = Array.from({ length: rows * cols }, () => 0);
  const at = (r: number, c: number) => r * cols + c;
  for (let r = 0; r < rows; r += 1) dp[at(r, 0)] = r;
  for (let c = 0; c < cols; c += 1) dp[at(0, c)] = c;
  for (let r = 1; r < rows; r += 1) {
    for (let c = 1; c < cols; c += 1) {
      const cost = a[r - 1] === b[c - 1] ? 0 : 1;
      dp[at(r, c)] = Math.min(dp[at(r - 1, c)] + 1, dp[at(r, c - 1)] + 1, dp[at(r - 1, c - 1)] + cost);
    }
  }
  return dp[at(rows - 1, cols - 1)];
}

function scoreSimilarity(input: string, accepted: string): number {
  const inputNorm = normalizeLoose(input);
  const acceptedNorm = normalizeLoose(accepted);
  if (!inputNorm || !acceptedNorm) return 0;
  if (inputNorm === acceptedNorm) return 1;
  const inputTokens = new Set(inputNorm.split(" "));
  const acceptedTokens = new Set(acceptedNorm.split(" "));
  let overlap = 0;
  for (const t of inputTokens) {
    if (acceptedTokens.has(t)) overlap += 1;
  }
  const union = new Set([...inputTokens, ...acceptedTokens]).size;
  const tokenScore = union > 0 ? overlap / union : 0;
  const maxLen = Math.max(inputNorm.length, acceptedNorm.length);
  const charScore = maxLen > 0 ? 1 - levenshtein(inputNorm, acceptedNorm) / maxLen : 0;
  return Math.max(0, Math.min(1, tokenScore * 0.55 + charScore * 0.45));
}

function buildMeaningDiagnosis(input: string, acceptedMeaning: string): GradingDiagnosis {
  const inputCandidates = getMeaningCandidates(input);
  const acceptedCandidates = getMeaningCandidates(acceptedMeaning);

  let bestInput = normalizeLoose(input);
  let bestAccepted = acceptedCandidates[0] ?? "";
  let bestScore = 0;

  for (const inputCandidate of inputCandidates) {
    for (const acceptedCandidate of acceptedCandidates) {
      const score = scoreSimilarity(inputCandidate, acceptedCandidate);
      if (score > bestScore) {
        bestScore = score;
        bestInput = normalizeLoose(inputCandidate);
        bestAccepted = acceptedCandidate;
      }
    }
  }

  const potentiallyDisputable = bestScore >= 0.78 && bestScore < 1;
  const reason =
    bestScore < 0.4
      ? "허용 답안과 유사성이 낮아 오답으로 판정했습니다."
      : potentiallyDisputable
      ? "허용 답안과 유사도가 높아 재검토 가능성이 있습니다."
      : "허용 답안과 부분적으로 유사하지만 채점 기준에 미달했습니다.";

  return {
    input,
    normalizedInput: bestInput,
    closestAccepted: bestAccepted,
    similarityScore: Number(bestScore.toFixed(3)),
    potentiallyDisputable,
    reason
  };
}
