import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parsePlan(raw: unknown): "FREE" | "PRO" | null {
  if (raw === "FREE" || raw === "PRO") return raw;
  return null;
}

const updatePlanSchema = z.object({
  plan: z.enum(["FREE", "PRO"]),
  proUntil: z
    .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .nullable()
    .optional(),
  isAdmin: z.boolean().optional()
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const admin = await getUserFromRequestCookies(req.cookies);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!admin.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const parsedBody = await parseJsonWithSchema(req, updatePlanSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  const plan = parsePlan(body.plan);
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
