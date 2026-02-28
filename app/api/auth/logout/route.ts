import { NextRequest, NextResponse } from "next/server";

import { errorJson } from "@/lib/api/service-response";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { AuthService } from "@/server/domain/auth/service";

const authService = new AuthService();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) {
    await recordApiMetricFromStart({
      route: "/api/auth/logout",
      method: "POST",
      status: badReq.status,
      startedAt
    });
    return badReq;
  }

  try {
    const { sessionCookieName, csrfCookieName } = authService.getCookieNames();

    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
    res.cookies.set(csrfCookieName, "", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
    await recordApiMetricFromStart({
      route: "/api/auth/logout",
      method: "POST",
      status: 200,
      startedAt
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/auth/logout",
      message: "auth_logout_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    await recordApiMetricFromStart({
      route: "/api/auth/logout",
      method: "POST",
      status: 500,
      startedAt
    });
    return errorJson({
      status: 500,
      code: "AUTH_LOGOUT_FAILED",
      message: "Logout failed."
    });
  }
}
