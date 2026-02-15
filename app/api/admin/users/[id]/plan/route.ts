import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parsePlan(raw: unknown): "FREE" | "PRO" | null {
  if (raw === "FREE" || raw === "PRO") return raw;
  return null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getUserFromRequestCookies(req.cookies);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!admin.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as
    | { plan?: unknown; proUntil?: string | null; isAdmin?: boolean }
    | null;
  const plan = parsePlan(body?.plan);
  if (!plan) return NextResponse.json({ error: "plan must be FREE or PRO." }, { status: 400 });

  const proUntil =
    body && "proUntil" in body
      ? body.proUntil
        ? new Date(String(body.proUntil))
        : null
      : undefined;
  if (proUntil instanceof Date && Number.isNaN(proUntil.getTime())) {
    return NextResponse.json({ error: "Invalid proUntil." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      plan,
      ...(proUntil === undefined ? {} : { proUntil }),
      ...(typeof body?.isAdmin === "boolean" ? { isAdmin: body.isAdmin } : {})
    },
    select: { id: true, email: true, isAdmin: true, plan: true, proUntil: true }
  });

  return NextResponse.json({ user: updated }, { status: 200 });
}

