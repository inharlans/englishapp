import { NextRequest } from "next/server";

import { jsonWithMetric } from "@/lib/api/metric-response";
import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { WordbookDownloadService } from "@/server/domain/wordbook/download-service";

const downloadService = new WordbookDownloadService();

const ROUTE = "/api/wordbooks/[id]/download";
const METHOD = "POST";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  const badReq = await assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `wordbookDownload:${ip}`,
    limit: 60,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return jsonWithMetric({
      route: ROUTE,
      method: METHOD,
      status: 429,
      startedAt,
      body: { error: "Too many requests." },
      headers: { "Retry-After": String(limit.retryAfterSeconds) }
    });
  }

  const { id: idRaw } = await ctx.params;
  const id = parsePositiveIntParam(idRaw);
  if (!id) {
    return jsonWithMetric({
      route: ROUTE,
      method: METHOD,
      status: 400,
      startedAt,
      body: { error: "Invalid id." }
    });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) {
    return jsonWithMetric({
      route: ROUTE,
      method: METHOD,
      status: 401,
      startedAt,
      body: { error: "Unauthorized." }
    });
  }
  const user = auth.user;

  const result = await downloadService.downloadForUser(user, id);

  if (!result.ok) {
    return jsonWithMetric({
      route: ROUTE,
      method: METHOD,
      status: result.status,
      startedAt,
      userId: user.id,
      body: { error: result.error }
    });
  }

  return jsonWithMetric({
    route: ROUTE,
    method: METHOD,
    status: 200,
    startedAt,
    userId: user.id,
    body: {
      ok: true,
      already: result.already,
      downloadedAt: result.downloadedAt,
      downloadCount: result.downloadCount,
      wordbookTitle: result.wordbookTitle ?? null
    }
  });
}
