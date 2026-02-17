import { NextRequest, NextResponse } from "next/server";

import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  if (!isAuthorized(req)) {
    const res = NextResponse.json({ error: "Forbidden." }, { status: 403 });
    await recordApiMetricFromStart({
      route: "/api/internal/cron/wordbook-rank",
      method: "POST",
      status: 403,
      startedAt
    });
    return res;
  }

  try {
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

    const res = NextResponse.json(
      {
        ok: true,
        recomputedCount: ids.length,
        staleCountBeforeRun: staleCount,
        ranAt: new Date().toISOString()
      },
      { status: 200 }
    );
    await recordApiMetricFromStart({
      route: "/api/internal/cron/wordbook-rank",
      method: "POST",
      status: 200,
      startedAt
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/internal/cron/wordbook-rank",
      message: "cron_wordbook_rank_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    await recordApiMetricFromStart({
      route: "/api/internal/cron/wordbook-rank",
      method: "POST",
      status: 500,
      startedAt
    });
    return NextResponse.json({ error: "Wordbook rank cron failed." }, { status: 500 });
  }
}
