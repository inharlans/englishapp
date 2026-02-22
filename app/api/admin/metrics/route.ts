import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { AdminService } from "@/server/domain/admin/service";

const adminService = new AdminService();

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  const result = await adminService.getMetrics(user);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.payload, { status: result.status });
}

