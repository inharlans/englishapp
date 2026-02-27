import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { parsePositiveIntParam } from "@/lib/api/route-helpers";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { AdminService } from "@/server/domain/admin/service";
import { z } from "zod";

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

const adminService = new AdminService();

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const userId = parsePositiveIntParam(idRaw);
  if (!userId) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

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

  const user = await getUserFromRequestCookies(req.cookies);
  const result = await adminService.updateUserPlan(user, {
    userId,
    plan,
    proUntil,
    isAdmin: typeof body?.isAdmin === "boolean" ? body.isAdmin : undefined
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.payload, { status: result.status });
}
