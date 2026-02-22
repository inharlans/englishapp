import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { hashIpForAudit } from "@/lib/ipHash";
import { getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { AdminService } from "@/server/domain/admin/service";
import { z } from "zod";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

const moderateReportSchema = z.object({
  action: z.enum(["review", "resolve", "dismiss", "hide"]),
  note: z.string().trim().max(1000).optional()
});

const adminService = new AdminService();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const reportId = parseId(idRaw);
  if (!reportId) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const parsedBody = await parseJsonWithSchema(req, moderateReportSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const user = await getUserFromRequestCookies(req.cookies);
  const result = await adminService.moderateReport(user, {
    reportId,
    action: parsedBody.data.action,
    note: parsedBody.data.note?.trim() || null,
    reviewerIpHash: hashIpForAudit(getClientIpFromHeaders(req.headers))
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.payload, { status: result.status });
}

