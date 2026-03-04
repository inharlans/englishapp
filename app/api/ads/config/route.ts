import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { errorJson } from "@/lib/api/service-response";
import { captureAppError } from "@/lib/observability";

const ROUTE = "/api/ads/config";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserFromRequest(req);
    if (!auth.ok) return auth.response;

    return NextResponse.json(
      {
        slots: {
          HOME_BANNER: false
        },
        isFallback: true
      },
      { status: 200 }
    );
  } catch (error) {
    await captureAppError({
      route: ROUTE,
      message: "ads_config_get_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        err: error instanceof Error ? error.message : String(error)
      }
    });

    return errorJson({
      status: 500,
      code: "ADS_CONFIG_GET_FAILED",
      message: "Failed to load ads config."
    });
  }
}
