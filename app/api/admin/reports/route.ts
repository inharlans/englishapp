import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { maskEmailAddress } from "@/lib/textQuality";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const reports = await prisma.wordbookReport.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      reason: true,
      detail: true,
      status: true,
      reporterTrustScore: true,
      createdAt: true,
      reviewedAt: true,
      moderatorNote: true,
      reviewAction: true,
      previousStatus: true,
      nextStatus: true,
      reviewerIpHash: true,
      reporter: { select: { id: true, email: true } },
      reviewedBy: { select: { id: true, email: true } },
      wordbook: {
        select: {
          id: true,
          title: true,
          isPublic: true,
          hiddenByAdmin: true,
          owner: { select: { id: true, email: true } }
        }
      }
    }
  });

  return NextResponse.json(
    {
      reports: reports.map((r) => {
        const qualityScore = Math.max(
          0,
          Math.min(
            100,
            100 -
              (r.wordbook.hiddenByAdmin ? 35 : 0) -
              (r.status === "OPEN" ? 20 : 0) -
              (r.reporterTrustScore < 0 ? 10 : 0)
          )
        );
        return {
          ...r,
          qualityScore,
          reporter: { ...r.reporter, email: maskEmailAddress(r.reporter.email) },
          reviewedBy: r.reviewedBy ? { ...r.reviewedBy, email: maskEmailAddress(r.reviewedBy.email) } : null,
          wordbook: {
            ...r.wordbook,
            owner: { ...r.wordbook.owner, email: maskEmailAddress(r.wordbook.owner.email) }
          }
        };
      })
    },
    { status: 200 }
  );
}
