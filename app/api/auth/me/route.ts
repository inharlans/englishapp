import { NextRequest, NextResponse } from "next/server";

import { errorJson } from "@/lib/api/service-response";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { toAuthMeResponse } from "@/server/domain/auth/mapper";
import { AuthService } from "@/server/domain/auth/service";

const authService = new AuthService();

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const payload = await authService.getMe(req.cookies);
    if (!payload.user) {
      const res = NextResponse.json(toAuthMeResponse(payload), { status: 200 });
      await recordApiMetricFromStart({
        route: "/api/auth/me",
        method: "GET",
        status: 200,
        startedAt
      });
      return res;
    }

    const res = NextResponse.json(toAuthMeResponse(payload), { status: 200 });

    if (!req.cookies.get(getCsrfCookieName())?.value) {
      res.cookies.set(getCsrfCookieName(), issueCsrfToken(), {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30
      });
    }

    await recordApiMetricFromStart({
      route: "/api/auth/me",
      method: "GET",
      status: 200,
      startedAt,
      userId: payload.user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/auth/me",
      message: "auth_me_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    await recordApiMetricFromStart({
      route: "/api/auth/me",
      method: "GET",
      status: 500,
      startedAt
    });
    return errorJson({
      status: 500,
      code: "AUTH_ME_FAILED",
      message: "Failed to load current user."
    });
  }
}
