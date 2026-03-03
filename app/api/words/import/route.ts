import { NextRequest, NextResponse } from "next/server";

import { errorJson } from "@/lib/api/service-response";
import {
  LEGACY_ROUTE_POLICIES,
  recordLegacyRouteAccess,
  withLegacyDeprecationHeaders
} from "@/lib/legacy-compat";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { WordsService } from "@/server/domain/words/service";
import { z } from "zod";

const importRequestSchema = z.object({
  rawText: z.string().min(1).max(1_000_000)
});

const wordsService = new WordsService();
const legacyPolicy = LEGACY_ROUTE_POLICIES.apiWordsImport;

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
    key: `wordsImport:${ip}`,
    limit: 10,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return withLegacyDeprecationHeaders(
      errorJson({
        status: 429,
        code: "RATE_LIMITED",
        message: "Too many requests.",
        headers: { "Retry-After": String(limit.retryAfterSeconds) }
      }),
      legacyPolicy
    );
  }

  try {
    const parsedBody = await parseJsonWithSchema(req, importRequestSchema);
    if (!parsedBody.ok) return withLegacyDeprecationHeaders(parsedBody.response, legacyPolicy);
    const result = await wordsService.importWords(parsedBody.data.rawText);
    return withLegacyDeprecationHeaders(NextResponse.json(result), legacyPolicy);
  } catch (error) {
    return withLegacyDeprecationHeaders(
      errorJson({
        status: 400,
        code: "WORDS_IMPORT_FAILED",
        message: error instanceof Error ? error.message : "Unexpected error during word import."
      }),
      legacyPolicy
    );
  }
}
