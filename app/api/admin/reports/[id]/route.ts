import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

type Body = {
  action?: "resolve" | "dismiss" | "hide";
  note?: string;
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const action = body?.action;
  if (action !== "resolve" && action !== "dismiss" && action !== "hide") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const note = (body?.note ?? "").trim() || null;
  const report = await prisma.wordbookReport.findUnique({
    where: { id },
    select: { id: true, wordbookId: true }
  });
  if (!report) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (action === "hide") {
    await prisma.$transaction([
      prisma.wordbook.update({
        where: { id: report.wordbookId },
        data: { isPublic: false, hiddenByAdmin: true }
      }),
      prisma.wordbookReport.update({
        where: { id },
        data: {
          status: "RESOLVED",
          reviewedById: user.id,
          reviewedAt: new Date(),
          moderatorNote: note
        }
      })
    ]);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await prisma.wordbookReport.update({
    where: { id },
    data: {
      status: action === "resolve" ? "RESOLVED" : "DISMISSED",
      reviewedById: user.id,
      reviewedAt: new Date(),
      moderatorNote: note
    }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

