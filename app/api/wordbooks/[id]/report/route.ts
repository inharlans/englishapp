import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const wordbookId = parseId(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wordbook = await prisma.wordbook.findUnique({
    where: { id: wordbookId },
    select: { id: true, ownerId: true, isPublic: true }
  });
  if (!wordbook || !wordbook.isPublic) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { reason?: string; detail?: string } | null;
  const reason = (body?.reason ?? "").trim();
  const detail = (body?.detail ?? "").trim() || null;
  if (!reason) {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }

  const report = await prisma.wordbookReport.create({
    data: {
      wordbookId,
      reporterId: user.id,
      reason,
      detail
    },
    select: { id: true, status: true, createdAt: true }
  });

  return NextResponse.json({ ok: true, report }, { status: 201 });
}

