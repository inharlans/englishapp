import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

const reportBodySchema = z.object({
  reason: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(2000).optional().nullable()
});

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

  const parsedBody = await parseJsonWithSchema(req, reportBodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const reason = parsedBody.data.reason;
  const detail = parsedBody.data.detail?.trim() || null;

  const now = new Date();
  const cooldownStart = new Date(now.getTime() - 30_000);
  const dailyStart = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const [recentReportCount, dailyReportCount] = await Promise.all([
    prisma.wordbookReport.count({
      where: { reporterId: user.id, createdAt: { gte: cooldownStart } }
    }),
    prisma.wordbookReport.count({
      where: { reporterId: user.id, createdAt: { gte: dailyStart } }
    })
  ]);

  if (recentReportCount > 0) {
    return NextResponse.json({ error: "Report cooldown active. Please wait a bit." }, { status: 429 });
  }
  if (dailyReportCount >= 30) {
    return NextResponse.json({ error: "Daily report limit reached." }, { status: 429 });
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

  const [resolvedCount, dismissedCount] = await Promise.all([
    prisma.wordbookReport.count({
      where: { reporterId: user.id, status: "RESOLVED" }
    }),
    prisma.wordbookReport.count({
      where: { reporterId: user.id, status: "DISMISSED" }
    })
  ]);
  const reviewedCount = resolvedCount + dismissedCount;
  const trustedRatio = reviewedCount > 0 ? resolvedCount / reviewedCount : 0.6;
  const reporterTrustScore = Math.max(0, Math.min(100, Math.round(trustedRatio * 100)));

  const report = await prisma.wordbookReport.create({
    data: {
      wordbookId,
      reporterId: user.id,
      reason,
      detail,
      reporterTrustScore
    },
    select: { id: true, status: true, createdAt: true }
  });

  return NextResponse.json({ ok: true, report }, { status: 201 });
}
