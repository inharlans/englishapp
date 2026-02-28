import { NextRequest, NextResponse } from "next/server";

import { errorJson } from "@/lib/api/service-response";
import { parsePositiveIntParam } from "@/lib/api/route-helpers";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { WordsService } from "@/server/domain/words/service";
import { z } from "zod";

const updateWordSchema = z.object({
  ko: z.string().trim().min(1).max(1000)
});

const wordsService = new WordsService();

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordPatch:${ip}`,
    limit: 60,
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
    const { id: rawId } = await context.params;
    const id = parsePositiveIntParam(rawId);
    if (!id) {
      return errorJson({ status: 400, code: "INVALID_WORD_ID", message: "Invalid word id." });
    }

    const parsedBody = await parseJsonWithSchema(req, updateWordSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const ko = parsedBody.data.ko.trim();

    const updated = await wordsService.updateWordKo(id, ko);
    return NextResponse.json({ word: updated });
  } catch (error) {
    return errorJson({
      status: 400,
      code: "WORD_UPDATE_FAILED",
      message: error instanceof Error ? error.message : "Unexpected error while updating word."
    });
  }
}
