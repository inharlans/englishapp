import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { serviceResultToJson } from "@/lib/api/service-response";
import { hashIpForAudit } from "@/lib/ipHash";
import { getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { AdminService } from "@/server/domain/admin/service";
import { z } from "zod";

const moderateReportSchema = z.object({
  action: z.enum(["review", "resolve", "dismiss", "hide"]),
  note: z.string().trim().max(1000).optional()
});

const adminService = new AdminService();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const reportId = parsePositiveIntParam(idRaw);
  if (!reportId) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const parsedBody = await parseJsonWithSchema(req, moderateReportSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const result = await adminService.moderateReport(auth.user, {
    reportId,
    action: parsedBody.data.action,
    note: parsedBody.data.note?.trim() || null,
    reviewerIpHash: hashIpForAudit(getClientIpFromHeaders(req.headers))
  });
  return serviceResultToJson(result);
}
