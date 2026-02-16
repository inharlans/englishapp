import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { hashIpForAudit } from "@/lib/ipHash";
import { prisma } from "@/lib/prisma";
import { getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

const moderateReportSchema = z.object({
  action: z.enum(["resolve", "dismiss", "hide"]),
  note: z.string().trim().max(1000).optional()
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const parsedBody = await parseJsonWithSchema(req, moderateReportSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const action = parsedBody.data.action;
  const note = parsedBody.data.note?.trim() || null;
  const reviewerIpHash = hashIpForAudit(getClientIpFromHeaders(req.headers));
  const report = await prisma.wordbookReport.findUnique({
    where: { id },
    select: { id: true, wordbookId: true, status: true }
  });
  if (!report) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (action === "hide") {
    const nextStatus = "RESOLVED";
    await prisma.$transaction([
      prisma.wordbook.update({
        where: { id: report.wordbookId },
        data: { isPublic: false, hiddenByAdmin: true }
      }),
      prisma.wordbookReport.update({
        where: { id },
        data: {
          status: nextStatus,
          previousStatus: report.status,
          nextStatus,
          reviewAction: action,
          reviewerIpHash,
          reviewedById: user.id,
          reviewedAt: new Date(),
          moderatorNote: note
        }
      })
    ]);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const nextStatus = action === "resolve" ? "RESOLVED" : "DISMISSED";
  await prisma.wordbookReport.update({
    where: { id },
    data: {
      status: nextStatus,
      previousStatus: report.status,
      nextStatus,
      reviewAction: action,
      reviewerIpHash,
      reviewedById: user.id,
      reviewedAt: new Date(),
      moderatorNote: note
    }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
