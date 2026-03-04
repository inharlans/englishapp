import { NextRequest, NextResponse } from "next/server";

import { errorJson } from "@/lib/api/service-response";
import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { captureAppError } from "@/lib/observability";
import { MobileHomeService } from "@/server/domain/mobile-home/service";

const ROUTE = "/api/users/me/study-preferences";

const mobileHomeService = new MobileHomeService();

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserFromRequest(req);
    if (!auth.ok) return auth.response;

    const payload = await mobileHomeService.getStudyPreferences(auth.user.id);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    await captureAppError({
      route: ROUTE,
      message: "study_preferences_get_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        err: error instanceof Error ? error.message : String(error)
      }
    });

    return errorJson({
      status: 500,
      code: "STUDY_PREFERENCES_GET_FAILED",
      message: "Failed to load study preferences."
    });
  }
}
