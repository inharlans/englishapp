import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { UserService } from "@/server/domain/user/service";

const bodySchema = z.object({
  dailyGoal: z.coerce.number().int().min(1).max(500)
});

const userService = new UserService();

export async function POST(req: NextRequest) {
  const badReq = await assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonWithSchema(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  const result = await userService.updateDailyGoal(auth.user.id, parsed.data.dailyGoal);

  return NextResponse.json(result, { status: 200 });
}
