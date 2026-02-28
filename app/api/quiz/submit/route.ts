import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema, zPositiveInt } from "@/lib/validation";
import { parseQuizMode, QuizService } from "@/server/domain/quiz/service";
import { z } from "zod";

const submitBodySchema = z.object({
  wordId: zPositiveInt,
  quizType: z.enum(["MEANING", "WORD"]),
  userAnswer: z.string().max(1000).default(""),
  scope: z.enum(["half"]).optional()
});

const quizService = new QuizService();

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

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

    const parsedBody = await parseJsonWithSchema(req, submitBodySchema);
    if (!parsedBody.ok) return parsedBody.response;

    const result = await quizService.submitLegacyQuizAnswer(user, {
      wordId: parsedBody.data.wordId,
      quizType: parseQuizMode(parsedBody.data.quizType),
      userAnswer: parsedBody.data.userAnswer,
      scope: parsedBody.data.scope
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error during quiz submission."
      },
      { status: 400 }
    );
  }
}
