import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { isBrokenUserText } from "@/lib/textQuality";
import { parseJsonWithSchema } from "@/lib/validation";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";
import { z } from "zod";

const rateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  review: z.string().trim().max(1000).optional().nullable()
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
  const id = parsePositiveIntParam(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const parsedBody = await parseJsonWithSchema(req, rateSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const rating = parsedBody.data.rating;
  const review = parsedBody.data.review ? parsedBody.data.review.trim() : null;
  if (review && isBrokenUserText(review)) {
    return NextResponse.json({ error: "리뷰 텍스트가 올바르지 않습니다." }, { status: 400 });
  }

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
      create: { userId: user.id, wordbookId: id, rating, review },
      update: { rating, review }
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
    {
      ok: true,
      ratingAvg: result.ratingAvg,
      ratingCount: result.ratingCount,
      myRating: rating,
      myReview: review
    },
    { status: 200 }
  );
}
