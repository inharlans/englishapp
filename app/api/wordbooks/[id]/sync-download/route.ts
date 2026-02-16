import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { aggregateVersionLogs } from "@/lib/wordbookVersion";
import { z } from "zod";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

const bodySchema = z.object({
  preserveStudyState: z.boolean().optional()
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const wordbookId = parseId(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsedBody = await parseJsonWithSchema(req, bodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const preserveStudyState = parsedBody.data.preserveStudyState !== false;

  const result = await prisma.$transaction(async (tx) => {
    const download = await tx.wordbookDownload.findUnique({
      where: { userId_wordbookId: { userId: user.id, wordbookId } },
      select: {
        userId: true,
        wordbookId: true,
        downloadedVersion: true,
        snapshotItemCount: true
      }
    });
    if (!download) {
      return { ok: false as const, status: 403, error: "Download required." };
    }

    const wb = await tx.wordbook.findUnique({
      where: { id: wordbookId },
      select: { id: true, contentVersion: true }
    });
    if (!wb) {
      return { ok: false as const, status: 404, error: "Not found." };
    }

    const itemCount = await tx.wordbookItem.count({ where: { wordbookId } });

    const logs = await tx.wordbookVersionLog.findMany({
      where: { wordbookId, version: { gt: download.downloadedVersion } },
      select: { addedCount: true, updatedCount: true, deletedCount: true }
    });
    const summary = aggregateVersionLogs(logs);

    if (!preserveStudyState) {
      await tx.wordbookStudyItemState.deleteMany({ where: { userId: user.id, wordbookId } });
      await tx.wordbookStudyState.deleteMany({ where: { userId: user.id, wordbookId } });
    }

    const synced = await tx.wordbookDownload.update({
      where: { userId_wordbookId: { userId: user.id, wordbookId } },
      data: {
        downloadedVersion: wb.contentVersion,
        snapshotItemCount: itemCount,
        syncedAt: new Date()
      },
      select: { downloadedVersion: true, snapshotItemCount: true, syncedAt: true }
    });

    return {
      ok: true as const,
      summary,
      preserveStudyState,
      synced,
      beforeVersion: download.downloadedVersion,
      latestVersion: wb.contentVersion
    };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      ok: true,
      beforeVersion: result.beforeVersion,
      latestVersion: result.latestVersion,
      preserveStudyState: result.preserveStudyState,
      summary: result.summary,
      synced: result.synced
    },
    { status: 200 }
  );
}
