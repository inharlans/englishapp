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
    key: `wordbookBlock:${ip}`,
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
    select: { ownerId: true, isPublic: true }
  });
  if (!wordbook || !wordbook.isPublic) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (wordbook.ownerId === user.id) {
    return NextResponse.json({ error: "Cannot block yourself." }, { status: 400 });
  }

  await prisma.blockedOwner.upsert({
    where: { userId_ownerId: { userId: user.id, ownerId: wordbook.ownerId } },
    create: { userId: user.id, ownerId: wordbook.ownerId },
    update: {}
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
