import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { isPublic?: boolean } | null;
  if (typeof body?.isPublic !== "boolean") {
    return NextResponse.json({ error: "isPublic boolean is required." }, { status: 400 });
  }

  if (user.plan === "FREE" && body.isPublic === false) {
    return NextResponse.json(
      { error: "Free plan wordbooks must be public." },
      { status: 403 }
    );
  }

  const existing = await prisma.wordbook.findUnique({
    where: { id },
    select: { ownerId: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const wordbook = await prisma.wordbook.update({
    where: { id },
    data: { isPublic: body.isPublic },
    select: { id: true, isPublic: true, updatedAt: true }
  });
  return NextResponse.json({ wordbook }, { status: 200 });
}
