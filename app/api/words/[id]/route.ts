import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

type UpdateWordBody = {
  ko?: string;
};

function parseId(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

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
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "Invalid word id." }, { status: 400 });
    }

    const body = (await req.json()) as UpdateWordBody;
    const ko = (body.ko ?? "").trim();
    if (!ko) {
      return NextResponse.json({ error: "ko cannot be empty." }, { status: 400 });
    }

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

