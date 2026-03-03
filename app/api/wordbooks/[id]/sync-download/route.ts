import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { WordbookSyncDownloadService } from "@/server/domain/wordbook/sync-download-service";
import { z } from "zod";

const bodySchema = z.object({
  preserveStudyState: z.boolean().optional()
});

const syncDownloadService = new WordbookSyncDownloadService();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = await assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const wordbookId = parsePositiveIntParam(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const parsedBody = await parseJsonWithSchema(req, bodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const preserveStudyState = parsedBody.data.preserveStudyState !== false;

  const result = await syncDownloadService.syncForUser({ user, wordbookId, preserveStudyState });

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
