import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wb = await prisma.wordbook.findUnique({
    where: { id },
    select: { id: true, isPublic: true, hiddenByAdmin: true }
  });
  if (!wb || !wb.isPublic || wb.hiddenByAdmin) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const takeRaw = Number(new URL(req.url).searchParams.get("take") ?? "30");
  const take = Math.min(Math.max(Number.isFinite(takeRaw) ? Math.floor(takeRaw) : 30, 1), 100);

  const reviews = await prisma.wordbookRating.findMany({
    where: {
      wordbookId: id,
      OR: [{ review: { not: null } }, { rating: { gte: 1 } }]
    },
    orderBy: [{ updatedAt: "desc" }],
    take,
    select: {
      id: true,
      rating: true,
      review: true,
      updatedAt: true,
      user: { select: { email: true } }
    }
  });

  return NextResponse.json(
    {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        updatedAt: r.updatedAt,
        userEmail: r.user.email
      }))
    },
    { status: 200 }
  );
}
