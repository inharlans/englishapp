import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { errorJson } from "@/lib/api/service-response";
import {
  LEGACY_ROUTE_POLICIES,
  recordLegacyRouteAccess,
  withLegacyDeprecationHeaders
} from "@/lib/legacy-compat";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { WordsService } from "@/server/domain/words/service";

const wordsService = new WordsService();
const legacyPolicy = LEGACY_ROUTE_POLICIES.apiWords;

export async function GET(req: NextRequest) {
  recordLegacyRouteAccess({
    policy: legacyPolicy,
    method: req.method,
    requestPath: new URL(req.url).pathname
  });

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordsGet:${ip}`,
    limit: 240,
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

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return withLegacyDeprecationHeaders(auth.response, legacyPolicy);

  const result = await wordsService.listWords(auth.user.id, new URL(req.url).searchParams);
  return withLegacyDeprecationHeaders(NextResponse.json(result), legacyPolicy);
}
