import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { errorJson } from "@/lib/api/service-response";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { WordsService } from "@/server/domain/words/service";

const wordsService = new WordsService();

export async function GET(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordsGet:${ip}`,
    limit: 240,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return errorJson({
      status: 429,
      code: "RATE_LIMITED",
      message: "Too many requests.",
      headers: { "Retry-After": String(limit.retryAfterSeconds) }
    });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const result = await wordsService.listWords(auth.user.id, new URL(req.url).searchParams);
  return NextResponse.json(result);
}
