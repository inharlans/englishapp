import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema, zPositiveInt } from "@/lib/validation";
import { UserService } from "@/server/domain/user/service";

const unblockSchema = z.object({
  ownerId: zPositiveInt
});

const userService = new UserService();

export async function GET(req: NextRequest) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const result = await userService.listBlockedOwners(auth.user.id);
  return NextResponse.json({ blocks: result.blocks }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonWithSchema(req, unblockSchema);
  if (!parsed.ok) return parsed.response;

  await userService.removeBlockedOwner(auth.user.id, parsed.data.ownerId);
  return NextResponse.json({ ok: true }, { status: 200 });
}
