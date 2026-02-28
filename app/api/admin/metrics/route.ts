import { NextRequest } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { serviceResultToJson } from "@/lib/api/service-response";
import { AdminService } from "@/server/domain/admin/service";

const adminService = new AdminService();

function parseClipperWindow(value: string | null): "1h" | "24h" | "7d" | null {
  if (value === null || value === "") return "24h";
  if (value === "1h" || value === "24h" || value === "7d") return value;
  return null;
}

function parseBoolean(value: string | null, defaultValue: boolean): boolean {
  if (value === null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return defaultValue;
}

export async function GET(req: NextRequest) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const clipperWindow = parseClipperWindow(req.nextUrl.searchParams.get("clipperWindow"));
  if (!clipperWindow) {
    return serviceResultToJson({ ok: false, status: 400, error: "Invalid clipperWindow." });
  }

  const result = await adminService.getMetrics(auth.user, {
    clipperWindow,
    clipperRefresh: parseBoolean(req.nextUrl.searchParams.get("clipperRefresh"), false)
  });
  return serviceResultToJson(result);
}
