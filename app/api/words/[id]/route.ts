import { NextRequest, NextResponse } from "next/server";

import { errorJson } from "@/lib/api/service-response";
import { parsePositiveIntParam } from "@/lib/api/route-helpers";
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

const updateWordSchema = z.object({
  ko: z.string().trim().min(1).max(1000)
});

const wordsService = new WordsService();
const legacyPolicy = LEGACY_ROUTE_POLICIES.apiWordsById;

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestPath = new URL(req.url).pathname;
  recordLegacyRouteAccess({
    policy: legacyPolicy,
    method: req.method,
    requestPath
  });

  const badReq = await assertTrustedMutationRequest(req);
  if (badReq) {
    return withLegacyDeprecationHeaders(badReq, legacyPolicy, requestPath);
  }

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordPatch:${ip}`,
    limit: 60,
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
      legacyPolicy,
      requestPath
    );
  }

  try {
    const { id: rawId } = await context.params;
    const id = parsePositiveIntParam(rawId);
    if (!id) {
      return withLegacyDeprecationHeaders(
        errorJson({ status: 400, code: "INVALID_WORD_ID", message: "Invalid word id." }),
        legacyPolicy,
        requestPath
      );
    }

    const parsedBody = await parseJsonWithSchema(req, updateWordSchema);
    if (!parsedBody.ok) return withLegacyDeprecationHeaders(parsedBody.response, legacyPolicy, requestPath);
    const ko = parsedBody.data.ko.trim();

    const updated = await wordsService.updateWordKo(id, ko);
    return withLegacyDeprecationHeaders(NextResponse.json({ word: updated }), legacyPolicy, requestPath);
  } catch (error) {
    return withLegacyDeprecationHeaders(
      errorJson({
        status: 400,
        code: "WORD_UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Unexpected error while updating word."
      }),
      legacyPolicy,
      requestPath
    );
  }
}
