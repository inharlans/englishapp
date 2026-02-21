import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { getMeaningCandidates, normalizeEn } from "@/lib/text";
import { captureAppError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { computeNextReviewAt } from "@/lib/scheduling";
import { invalidateStudyPartStatsCacheForWordbook } from "@/lib/studyPartStatsCache";
import { parseJsonWithSchema, zPositiveInt } from "@/lib/validation";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";
import { z } from "zod";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

const submitSchema = z.object({
  itemId: zPositiveInt,
  mode: z.enum(["MEANING", "WORD"]).optional(),
  answer: z.string().trim().min(1).max(1000)
});

type GradingDiagnosis = {
  input: string;
  normalizedInput: string;
  closestAccepted: string;
  similarityScore: number;
  potentiallyDisputable: boolean;
  reason: string;
};

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
      ? "허용 답안과 유사성이 낮아 오답으로 판정되었습니다."
      : potentiallyDisputable
      ? "허용 답안과 유사도가 높아 재검토 여지가 있습니다."
      : "허용 답안과 부분적으로 유사하지만 기준 미달입니다.";

  return {
    input,
    normalizedInput: bestInput,
    closestAccepted: bestAccepted,
    similarityScore: Number(bestScore.toFixed(3)),
    potentiallyDisputable,
    reason
  };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookQuizSubmit:${ip}`,
    limit: 120,
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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const allowed = await canAccessWordbookForStudy({ userId: user.id, wordbookId });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsedBody = await parseJsonWithSchema(req, submitSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const itemId = parsedBody.data.itemId;
  const mode = parsedBody.data.mode === "WORD" ? "WORD" : "MEANING";
  const answer = parsedBody.data.answer.trim();

  const item = await prisma.wordbookItem.findFirst({
    where: { id: itemId, wordbookId },
    select: { id: true, term: true, meaning: true }
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const acceptedMeaningAnswers = mode === "MEANING" ? getMeaningCandidates(item.meaning) : [];
  const correct =
    mode === "WORD"
      ? normalizeEn(answer) === normalizeEn(item.term)
      : getMeaningCandidates(answer).some((c) => acceptedMeaningAnswers.includes(c));
  const gradingDiagnosis =
    mode === "MEANING"
      ? buildMeaningDiagnosis(answer, item.meaning)
      : {
          input: answer,
          normalizedInput: normalizeEn(answer),
          closestAccepted: item.term,
          similarityScore: Number(scoreSimilarity(answer, item.term).toFixed(3)),
          potentiallyDisputable: false,
          reason: "단어 모드는 정규화된 완전 일치 기준으로 채점합니다."
        };

  const existing = await prisma.wordbookStudyItemState.findUnique({
    where: { userId_wordbookId_itemId: { userId: user.id, wordbookId, itemId: item.id } },
    select: {
      status: true,
      streak: true,
      everCorrect: true,
      everWrong: true,
      meaningCorrectStreak: true,
      wordCorrectStreak: true
    }
  });

  const now = new Date();

  const stateRow = await prisma.wordbookStudyState.upsert({
    where: { userId_wordbookId: { userId: user.id, wordbookId } },
    create: {
      userId: user.id,
      wordbookId,
      meaningQuestionCount: mode === "MEANING" ? 1 : 0,
      wordQuestionCount: mode === "WORD" ? 1 : 0
    },
    update: {
      ...(mode === "MEANING"
        ? { meaningQuestionCount: { increment: 1 } }
        : { wordQuestionCount: { increment: 1 } })
    },
    select: { meaningQuestionCount: true, wordQuestionCount: true }
  });

  const questionCountAfter = mode === "MEANING" ? stateRow.meaningQuestionCount : stateRow.wordQuestionCount;

  const meaningCurrentStreak = existing?.meaningCorrectStreak ?? 0;
  const wordCurrentStreak = existing?.wordCorrectStreak ?? 0;
  const modeCurrentStreak = mode === "MEANING" ? meaningCurrentStreak : wordCurrentStreak;
  const modeNextStreak = correct ? modeCurrentStreak + 1 : 0;
  const modeNextReviewAt = correct ? computeNextReviewAt(now, modeNextStreak) : null;
  const modeWrongRequeueAt = correct ? null : questionCountAfter + 10;
  const nextStatus = correct ? "CORRECT" : "WRONG";

  const streak = correct ? (existing?.streak ?? 0) + 1 : 0;
  const everCorrect = (existing?.everCorrect ?? false) || correct;
  const everWrong = (existing?.everWrong ?? false) || !correct;

  await prisma.wordbookStudyItemState.upsert({
    where: { userId_wordbookId_itemId: { userId: user.id, wordbookId, itemId: item.id } },
    create: {
      userId: user.id,
      wordbookId,
      itemId: item.id,
      status: nextStatus,
      streak,
      meaningCorrectStreak: mode === "MEANING" ? modeNextStreak : 0,
      meaningNextReviewAt: mode === "MEANING" ? modeNextReviewAt : null,
      meaningWrongRequeueAt: mode === "MEANING" ? modeWrongRequeueAt : null,
      wordCorrectStreak: mode === "WORD" ? modeNextStreak : 0,
      wordNextReviewAt: mode === "WORD" ? modeNextReviewAt : null,
      wordWrongRequeueAt: mode === "WORD" ? modeWrongRequeueAt : null,
      everCorrect,
      everWrong,
      lastResult: correct ? "CORRECT" : "WRONG"
    },
    update: {
      status: nextStatus,
      streak,
      ...(mode === "MEANING"
        ? {
            meaningCorrectStreak: modeNextStreak,
            meaningNextReviewAt: modeNextReviewAt,
            meaningWrongRequeueAt: modeWrongRequeueAt
          }
        : {
            wordCorrectStreak: modeNextStreak,
            wordNextReviewAt: modeNextReviewAt,
            wordWrongRequeueAt: modeWrongRequeueAt
          }),
      everCorrect,
      everWrong,
      lastResult: correct ? "CORRECT" : "WRONG"
    }
  });

  const previousStatus = existing?.status ?? null;
  const studiedDelta = previousStatus ? 0 : 1;
  const correctDelta = (previousStatus === "CORRECT" ? -1 : 0) + (nextStatus === "CORRECT" ? 1 : 0);
  const wrongDelta = (previousStatus === "WRONG" ? -1 : 0) + (nextStatus === "WRONG" ? 1 : 0);
  if (studiedDelta !== 0 || correctDelta !== 0 || wrongDelta !== 0) {
    await prisma.wordbookStudyState.update({
      where: { userId_wordbookId: { userId: user.id, wordbookId } },
      data: {
        ...(studiedDelta !== 0 ? { studiedCount: { increment: studiedDelta } } : {}),
        ...(correctDelta !== 0 ? { correctCount: { increment: correctDelta } } : {}),
        ...(wrongDelta !== 0 ? { wrongCount: { increment: wrongDelta } } : {})
      }
    });
  }

  invalidateStudyPartStatsCacheForWordbook(user.id, wordbookId);

  if (!correct) {
    await captureAppError({
      level: "warn",
      route: "/api/wordbooks/[id]/quiz/submit",
      message: "quiz_grading_diagnostic",
      userId: user.id,
      context: {
        mode,
        wordbookId,
        itemId: item.id,
        potentiallyDisputable: gradingDiagnosis.potentiallyDisputable,
        similarityScore: gradingDiagnosis.similarityScore
      }
    });
  }

  return NextResponse.json(
    {
      correct,
      correctAnswer: { term: item.term, meaning: item.meaning },
      acceptedMeaningAnswers: mode === "MEANING" ? acceptedMeaningAnswers.slice(0, 8) : undefined,
      gradingDiagnosis
    },
    { status: 200 }
  );
}

