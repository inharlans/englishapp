import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam } from "@/lib/api/route-helpers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

const updateWordSchema = z.object({
  ko: z.string().trim().min(1).max(1000)
});

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
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const { id: rawId } = await context.params;
    const id = parsePositiveIntParam(rawId);
    if (!id) {
      return NextResponse.json({ error: "Invalid word id." }, { status: 400 });
    }

    const parsedBody = await parseJsonWithSchema(req, updateWordSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const ko = parsedBody.data.ko.trim();

    const updated = await prisma.word.update({
      where: { id },
      data: { ko },
      select: { id: true, en: true, ko: true }
    });
    return NextResponse.json({ word: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error while updating word." },
      { status: 400 }
    );
  }
}
