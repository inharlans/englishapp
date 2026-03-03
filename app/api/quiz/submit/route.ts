import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/authServer";
import {
  LEGACY_ROUTE_POLICIES,
  recordLegacyRouteAccess,
  withLegacyDeprecationHeaders
} from "@/lib/legacy-compat";
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
const legacyPolicy = LEGACY_ROUTE_POLICIES.apiQuizSubmit;

export async function POST(req: NextRequest) {
  recordLegacyRouteAccess({
    policy: legacyPolicy,
    method: req.method,
    requestPath: new URL(req.url).pathname
  });

  const badReq = await assertTrustedMutationRequest(req);
  if (badReq) {
    return withLegacyDeprecationHeaders(badReq, legacyPolicy);
  }

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `quizSubmit:${ip}`,
    limit: 120,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return withLegacyDeprecationHeaders(
      NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      ),
      legacyPolicy
    );
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return withLegacyDeprecationHeaders(
        NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
        legacyPolicy
      );
    }
    const parsedBody = await parseJsonWithSchema(req, submitBodySchema);
    if (!parsedBody.ok) return withLegacyDeprecationHeaders(parsedBody.response, legacyPolicy);

    const result = await quizService.submitLegacyQuizAnswer(user, {
      wordId: parsedBody.data.wordId,
      quizType: parseQuizMode(parsedBody.data.quizType),
      userAnswer: parsedBody.data.userAnswer,
      scope: parsedBody.data.scope
    });

    if (!result.ok) {
      return withLegacyDeprecationHeaders(
        NextResponse.json({ error: result.error }, { status: result.status }),
        legacyPolicy
      );
    }

    return withLegacyDeprecationHeaders(NextResponse.json(result.payload, { status: 200 }), legacyPolicy);
  } catch (error) {
    return withLegacyDeprecationHeaders(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Unexpected error during quiz submission."
        },
        { status: 400 }
      ),
      legacyPolicy
    );
  }
}
