import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { errorJson } from "@/lib/api/service-response";
import { captureAppError } from "@/lib/observability";

const ROUTE = "/api/llm/quota";
const FALLBACK_LIMIT = 100;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserFromRequest(req);
    if (!auth.ok) return auth.response;

    return NextResponse.json(
      {
        used: 0,
        limit: FALLBACK_LIMIT,
        isFallback: true
      },
      { status: 200 }
    );
  } catch (error) {
    await captureAppError({
      route: ROUTE,
      message: "llm_quota_get_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        err: error instanceof Error ? error.message : String(error)
      }
    });

    return errorJson({
      status: 500,
      code: "LLM_QUOTA_GET_FAILED",
      message: "Failed to load llm quota."
    });
  }
}
