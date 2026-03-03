import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { WordbookContentService } from "@/server/domain/wordbook/content-service";
import { z } from "zod";

const importWordbookSchema = z.object({
  rawText: z.string().min(1).max(1_000_000),
  format: z.enum(["tsv", "csv"]).optional(),
  fillPronunciation: z.boolean().optional(),
  replaceAll: z.boolean().optional()
});

const contentService = new WordbookContentService();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = await assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookImport:${ip}`,
    limit: 15,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
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

  const parsedBody = await parseJsonWithSchema(req, importWordbookSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const result = await contentService.importForOwner({
    user,
    wordbookId,
    rawText: parsedBody.data.rawText,
    format: parsedBody.data.format === "csv" ? "csv" : "tsv",
    fillPronunciation: parsedBody.data.fillPronunciation === true,
    replaceAll: parsedBody.data.replaceAll === true
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, importedCount: result.importedCount }, { status: 201 });
}
