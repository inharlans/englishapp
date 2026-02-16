import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const staleCount = await prisma.wordbook.count({
    where: {
      OR: [{ rankScoreUpdatedAt: null }, { rankScoreUpdatedAt: { lt: staleBefore } }]
    }
  });

  const ids = await prisma.wordbook.findMany({ select: { id: true } });
  for (const wb of ids) {
    await refreshWordbookRankScore(prisma, wb.id);
  }

  return NextResponse.json(
    {
      ok: true,
      recomputedCount: ids.length,
      staleCountBeforeRun: staleCount,
      ranAt: new Date().toISOString()
    },
    { status: 200 }
  );
}

