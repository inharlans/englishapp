import { NextRequest, NextResponse } from "next/server";

import { errorJson } from "@/lib/api/service-response";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { WordsService } from "@/server/domain/words/service";
import { z } from "zod";

const importRequestSchema = z.object({
  rawText: z.string().min(1).max(1_000_000)
});

const wordsService = new WordsService();

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordsImport:${ip}`,
    limit: 10,
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

  try {
    const parsedBody = await parseJsonWithSchema(req, importRequestSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const result = await wordsService.importWords(parsedBody.data.rawText);
    return NextResponse.json(result);
  } catch (error) {
    return errorJson({
      status: 400,
      code: "WORDS_IMPORT_FAILED",
      message: error instanceof Error ? error.message : "Unexpected error during word import."
    });
  }
}
