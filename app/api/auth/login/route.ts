import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { getSessionCookieName, issueSessionToken } from "@/lib/authJwt";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { captureAppError, recordApiMetric } from "@/lib/observability";
import { verifyPassword } from "@/lib/password";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(512)
});

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
      { error: "Too many requests." },
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
    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true }
    });
    if (!user) {
      const res = NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      await recordApiMetric({
        route: "/api/auth/login",
        method: "POST",
        status: 401,
        latencyMs: Date.now() - startedAt
      });
      return res;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      const res = NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      await recordApiMetric({
        route: "/api/auth/login",
        method: "POST",
        status: 401,
        latencyMs: Date.now() - startedAt
      });
      return res;
    }

    const token = await issueSessionToken({
      userId: user.id,
      email: user.email,
      ttlSeconds: 60 * 60 * 24 * 30
    });

    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
    const csrfToken = issueCsrfToken();
    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    res.cookies.set(getCsrfCookieName(), csrfToken, {
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
      userId: user.id
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
      { error: error instanceof Error ? error.message : "Login failed." },
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
