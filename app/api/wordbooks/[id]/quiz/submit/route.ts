import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { captureAppError } from "@/lib/observability";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema, zPositiveInt } from "@/lib/validation";
import { parseQuizMode, QuizService } from "@/server/domain/quiz/service";
import { z } from "zod";

const submitSchema = z.object({
  itemId: zPositiveInt,
  mode: z.enum(["MEANING", "WORD"]).optional(),
  answer: z.string().trim().min(1).max(120)
});

const quizService = new QuizService();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = await assertTrustedMutationRequest(req);
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
  const wordbookId = parsePositiveIntParam(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const parsedBody = await parseJsonWithSchema(req, submitSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const mode = parseQuizMode(parsedBody.data.mode ?? null);
  const result = await quizService.submitWordbookQuizAnswer(user, wordbookId, {
    itemId: parsedBody.data.itemId,
    mode,
    answer: parsedBody.data.answer.trim()
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (!result.payload.correct) {
    await captureAppError({
      level: "warn",
      route: "/api/wordbooks/[id]/quiz/submit",
      message: "quiz_grading_diagnostic",
      userId: user.id,
      context: {
        mode,
        wordbookId,
        itemId: parsedBody.data.itemId,
        potentiallyDisputable: result.payload.gradingDiagnosis.potentiallyDisputable,
        similarityScore: result.payload.gradingDiagnosis.similarityScore
      }
    });
  }

  return NextResponse.json(result.payload, { status: 200 });
}
