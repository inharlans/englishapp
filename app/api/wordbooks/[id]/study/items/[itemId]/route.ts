import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";
import { WordbookStudyItemService } from "@/server/domain/wordbook/study-item-service";
import { z } from "zod";

const studyItemBodySchema = z.object({
  result: z.enum(["CORRECT", "WRONG", "RESET"])
});

const studyItemService = new WordbookStudyItemService();

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; itemId: string }> }
) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookStudyWrite:${ip}`,
    limit: 120,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { id: idRaw, itemId: itemIdRaw } = await ctx.params;
  const wordbookId = parsePositiveIntParam(idRaw);
  const itemId = parsePositiveIntParam(itemIdRaw);
  if (!wordbookId || !itemId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const allowed = await canAccessWordbookForStudy({ userId: user.id, wordbookId });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsedBody = await parseJsonWithSchema(req, studyItemBodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const result = parsedBody.data.result;

  const submit = await studyItemService.submitResult({
    userId: user.id,
    wordbookId,
    itemId,
    result
  });
  if (!submit.ok) {
    return NextResponse.json({ error: submit.error }, { status: submit.status });
  }

  return NextResponse.json(submit.payload, { status: 200 });
}
