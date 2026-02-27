import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { FREE_DOWNLOAD_WORD_LIMIT } from "@/lib/planLimits";
import { recordApiMetric } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { isActiveProPlan } from "@/lib/userPlan";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookDownload:${ip}`,
    limit: 60,
    windowMs: 60_000
  });
  if (!limit.ok) {
    const res = NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
    await recordApiMetric({
      route: "/api/wordbooks/[id]/download",
      method: "POST",
      status: 429,
      latencyMs: Date.now() - startedAt
    });
    return res;
  }

  const { id: idRaw } = await ctx.params;
  const id = parsePositiveIntParam(idRaw);
  if (!id) {
    const res = NextResponse.json({ error: "Invalid id." }, { status: 400 });
    await recordApiMetric({
      route: "/api/wordbooks/[id]/download",
      method: "POST",
      status: 400,
      latencyMs: Date.now() - startedAt
    });
    return res;
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) {
    const res = auth.response;
    await recordApiMetric({
      route: "/api/wordbooks/[id]/download",
      method: "POST",
      status: 401,
      latencyMs: Date.now() - startedAt
    });
    return res;
  }
  const user = auth.user;

  const result = await prisma.$transaction(async (tx) => {
    const wordbook = await tx.wordbook.findUnique({
      where: { id },
      select: { id: true, title: true, isPublic: true, hiddenByAdmin: true, downloadCount: true, contentVersion: true }
    });
    if (!wordbook || !wordbook.isPublic || wordbook.hiddenByAdmin) {
      return { ok: false as const, status: 404, error: "Not found." };
    }

    const existing = await tx.wordbookDownload.findUnique({
      where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
      select: { id: true, createdAt: true }
    });

    if (existing) {
      return {
        ok: true as const,
        already: true,
        downloadedAt: existing.createdAt,
        downloadCount: wordbook.downloadCount,
        wordbookTitle: wordbook.title
      };
    }

    const itemCount = await tx.wordbookItem.count({ where: { wordbookId: id } });

    // Plan enforcement: FREE => cumulative downloaded words limit.
    if (!isActiveProPlan({ plan: user.plan, proUntil: user.proUntil })) {
      const usedRows = await tx.wordbookDownload.findMany({
        where: { userId: user.id },
        select: { wordbookId: true, snapshotItemCount: true }
      });
      let usedWords = 0;
      const missingWordbookIds: number[] = [];
      for (const row of usedRows) {
        if (typeof row.snapshotItemCount === "number") {
          usedWords += Math.max(0, row.snapshotItemCount);
        } else {
          missingWordbookIds.push(row.wordbookId);
        }
      }
      if (missingWordbookIds.length > 0) {
        const grouped = await tx.wordbookItem.groupBy({
          by: ["wordbookId"],
          where: { wordbookId: { in: missingWordbookIds } },
          _count: { _all: true }
        });
        usedWords += grouped.reduce((acc, row) => acc + row._count._all, 0);
      }

      if (usedWords + itemCount > FREE_DOWNLOAD_WORD_LIMIT) {
        return {
          ok: false as const,
          status: 402,
          error: `무료 요금제 누적 다운로드 한도(${FREE_DOWNLOAD_WORD_LIMIT}단어)에 도달했습니다.`
        };
      }
    }

    const created = await tx.wordbookDownload.create({
      data: {
        userId: user.id,
        wordbookId: id,
        downloadedVersion: wordbook.contentVersion,
        snapshotItemCount: itemCount,
        syncedAt: new Date()
      },
      select: { createdAt: true }
    });

    const updated = await tx.wordbook.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
      select: { downloadCount: true }
    });
    await refreshWordbookRankScore(tx, id);

    return {
      ok: true as const,
      already: false,
      downloadedAt: created.createdAt,
      downloadCount: updated.downloadCount,
      wordbookTitle: wordbook.title
    };
  });

  if (!result.ok) {
    const res = NextResponse.json({ error: result.error }, { status: result.status });
    await recordApiMetric({
      route: "/api/wordbooks/[id]/download",
      method: "POST",
      status: result.status,
      latencyMs: Date.now() - startedAt,
      userId: user.id
    });
    return res;
  }

  const res = NextResponse.json(
    {
      ok: true,
      already: result.already,
      downloadedAt: result.downloadedAt,
      downloadCount: result.downloadCount,
      wordbookTitle: result.wordbookTitle ?? null
    },
    { status: 200 }
  );
  await recordApiMetric({
    route: "/api/wordbooks/[id]/download",
    method: "POST",
    status: 200,
    latencyMs: Date.now() - startedAt,
    userId: user.id
  });
  return res;
}
