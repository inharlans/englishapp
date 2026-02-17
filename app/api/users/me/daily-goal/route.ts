import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";

const bodySchema = z.object({
  dailyGoal: z.coerce.number().int().min(1).max(500)
});

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = await parseJsonWithSchema(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  await prisma.user.update({
    where: { id: user.id },
    data: { dailyGoal: parsed.data.dailyGoal }
  });

  return NextResponse.json({ ok: true, dailyGoal: parsed.data.dailyGoal }, { status: 200 });
}
