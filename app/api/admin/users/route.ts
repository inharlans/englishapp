import { NextRequest } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { serviceResultToJson } from "@/lib/api/service-response";
import { AdminService } from "@/server/domain/admin/service";

const adminService = new AdminService();

export async function GET(req: NextRequest) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const result = await adminService.listUsers(auth.user);
  return serviceResultToJson(result);
}
