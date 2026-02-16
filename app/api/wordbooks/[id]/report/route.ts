import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookReport:${ip}`,
    limit: 20,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { id: idRaw } = await ctx.params;
  const wordbookId = parseId(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wordbook = await prisma.wordbook.findUnique({
    where: { id: wordbookId },
    select: { id: true, ownerId: true, isPublic: true }
  });
  if (!wordbook || !wordbook.isPublic) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { reason?: string; detail?: string } | null;
  const reason = (body?.reason ?? "").trim();
  const detail = (body?.detail ?? "").trim() || null;
  if (!reason) {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }
  if (reason.length > 120 || (detail && detail.length > 2000)) {
    return NextResponse.json({ error: "reason/detail too long." }, { status: 400 });
  }

  const existingOpen = await prisma.wordbookReport.findFirst({
    where: {
      wordbookId,
      reporterId: user.id,
      status: "OPEN"
    },
    select: { id: true }
  });
  if (existingOpen) {
    return NextResponse.json({ error: "You already have an open report for this wordbook." }, { status: 409 });
  }

  const report = await prisma.wordbookReport.create({
    data: {
      wordbookId,
      reporterId: user.id,
      reason,
      detail
    },
    select: { id: true, status: true, createdAt: true }
  });

  return NextResponse.json({ ok: true, report }, { status: 201 });
}
