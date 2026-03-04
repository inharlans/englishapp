import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { errorJson } from "@/lib/api/service-response";
import { captureAppError } from "@/lib/observability";
import { MobileHomeService } from "@/server/domain/mobile-home/service";

const ROUTE = "/api/home/summary";

const mobileHomeService = new MobileHomeService();

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserFromRequest(req);
    if (!auth.ok) return auth.response;

    const payload = await mobileHomeService.getSummary(auth.user.id);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    await captureAppError({
      route: ROUTE,
      message: "home_summary_get_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        err: error instanceof Error ? error.message : String(error)
      }
    });

    return errorJson({
      status: 500,
      code: "HOME_SUMMARY_GET_FAILED",
      message: "Failed to load home summary."
    });
  }
}
