import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { computeWordbookRankScore } from "@/lib/wordbookRanking";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { getEffectivePlan } from "@/lib/userPlan";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

const createWordbookSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  fromLang: z.string().trim().min(2).max(12).optional(),
  toLang: z.string().trim().min(2).max(12).optional()
});

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

  const parsedBody = await parseJsonWithSchema(req, createWordbookSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const title = parsedBody.data.title.trim();
  const fromLang = (parsedBody.data.fromLang ?? "en").trim() || "en";
  const toLang = (parsedBody.data.toLang ?? "ko").trim() || "ko";
  const description = parsedBody.data.description ? parsedBody.data.description.trim() : null;

  // Plan enforcement: FREE users can create only 1 wordbook lifetime.
  const effectivePlan = getEffectivePlan({ plan: user.plan, proUntil: user.proUntil });
  if (effectivePlan === "FREE") {
    const createdCount = await prisma.wordbook.count({ where: { ownerId: user.id } });
    if (createdCount >= 1) {
      return NextResponse.json(
        {
          error: "무료 요금제는 단어장 1개만 생성할 수 있습니다. PRO로 업그레이드해주세요."
        },
        { status: 403 }
      );
    }
  }

  const wordbook = await prisma.wordbook.create({
    data: {
      ownerId: user.id,
      title,
      description,
      fromLang,
      toLang,
      // Free plan uploads are forced public.
      isPublic: effectivePlan === "FREE"
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
