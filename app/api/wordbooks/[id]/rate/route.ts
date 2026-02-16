import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";
import { z } from "zod";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

const rateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5)
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookRate:${ip}`,
    limit: 60,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsedBody = await parseJsonWithSchema(req, rateSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const rating = parsedBody.data.rating;

  const result = await prisma.$transaction(async (tx) => {
    const wordbook = await tx.wordbook.findUnique({
      where: { id },
      select: { id: true, isPublic: true, ownerId: true }
    });
    if (!wordbook || !wordbook.isPublic) {
      return { ok: false as const, status: 404, error: "Not found." };
    }

    const canRate =
      wordbook.ownerId === user.id
        ? true
        : !!(await tx.wordbookDownload.findUnique({
            where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
            select: { id: true }
          }));

    if (!canRate) {
      return { ok: false as const, status: 403, error: "Download required to rate." };
    }

    await tx.wordbookRating.upsert({
      where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
      create: { userId: user.id, wordbookId: id, rating },
      update: { rating }
    });

    const agg = await tx.wordbookRating.aggregate({
      where: { wordbookId: id },
      _avg: { rating: true },
      _count: { rating: true }
    });

    const updated = await tx.wordbook.update({
      where: { id },
      data: {
        ratingAvg: agg._avg.rating ?? 0,
        ratingCount: agg._count.rating
      },
      select: { ratingAvg: true, ratingCount: true }
    });
    await refreshWordbookRankScore(tx, id);

    return { ok: true as const, ratingAvg: updated.ratingAvg, ratingCount: updated.ratingCount };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { ok: true, ratingAvg: result.ratingAvg, ratingCount: result.ratingCount, myRating: rating },
    { status: 200 }
  );
}
