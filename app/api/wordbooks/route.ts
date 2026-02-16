import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { computeWordbookRankScore } from "@/lib/wordbookRanking";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wordbooks = await prisma.wordbook.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      fromLang: true,
      toLang: true,
      isPublic: true,
      downloadCount: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { items: true } }
    }
  });

  return NextResponse.json({ wordbooks }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { title?: string; description?: string | null; fromLang?: string; toLang?: string }
    | null;
  const title = (body?.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const fromLang = (body?.fromLang ?? "en").trim() || "en";
  const toLang = (body?.toLang ?? "ko").trim() || "ko";
  const description = body?.description ? body.description.trim() : null;

  const wordbook = await prisma.wordbook.create({
    data: {
      ownerId: user.id,
      title,
      description,
      fromLang,
      toLang,
      // Free plan uploads are forced public.
      isPublic: user.plan === "FREE"
    },
    select: {
      id: true,
      title: true,
      description: true,
      fromLang: true,
      toLang: true,
      isPublic: true,
      downloadCount: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      updatedAt: true
    }
  });

  await prisma.wordbook.update({
    where: { id: wordbook.id },
    data: {
      rankScore: computeWordbookRankScore({
        ratingAvg: 0,
        ratingCount: 0,
        downloadCount: 0,
        createdAt: wordbook.createdAt
      }),
      rankScoreUpdatedAt: new Date()
    }
  });

  return NextResponse.json({ wordbook }, { status: 201 });
}
