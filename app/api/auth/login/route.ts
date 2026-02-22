import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { captureAppError, recordApiMetric } from "@/lib/observability";
import { parseJsonWithSchema } from "@/lib/validation";
import { toUnauthorizedMessage } from "@/server/domain/auth/mapper";
import { AuthService } from "@/server/domain/auth/service";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(512)
});

const authService = new AuthService();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `authLogin:${ip}`,
    limit: 20,
    windowMs: 60_000
  });
  if (!limit.ok) {
    const res = NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
    await recordApiMetric({
      route: "/api/auth/login",
      method: "POST",
      status: 429,
      latencyMs: Date.now() - startedAt
    });
    return res;
  }

  try {
    const parsed = await parseJsonWithSchema(req, loginSchema);
    if (!parsed.ok) return parsed.response;

    const result = await authService.login(parsed.data);
    if (!result) {
      const res = NextResponse.json(toUnauthorizedMessage(), { status: 401 });
      await recordApiMetric({
        route: "/api/auth/login",
        method: "POST",
        status: 401,
        latencyMs: Date.now() - startedAt
      });
      return res;
    }

    const res = NextResponse.json({ ok: true, user: result.user });
    const { sessionCookieName, csrfCookieName } = authService.getCookieNames();

    res.cookies.set(sessionCookieName, result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    res.cookies.set(csrfCookieName, result.csrfToken, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    await recordApiMetric({
      route: "/api/auth/login",
      method: "POST",
      status: 200,
      latencyMs: Date.now() - startedAt,
      userId: result.user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/auth/login",
      message: "auth_login_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    const res = NextResponse.json(
      { error: error instanceof Error ? error.message : "로그인 처리에 실패했습니다." },
      { status: 400 }
    );
    await recordApiMetric({
      route: "/api/auth/login",
      method: "POST",
      status: 400,
      latencyMs: Date.now() - startedAt
    });
    return res;
  }
}
