import { NextRequest } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { serviceResultToJson } from "@/lib/api/service-response";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { AdminService } from "@/server/domain/admin/service";

const adminService = new AdminService();

export async function POST(req: NextRequest) {
  const badReq = await assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const result = await adminService.recomputeWordbookRank(auth.user);
  return serviceResultToJson(result);
}
