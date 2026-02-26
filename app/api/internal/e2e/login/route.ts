import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionCookieName, issueSessionToken } from "@/lib/authJwt";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { recordApiMetricFromStart } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import { parseJsonWithSchema } from "@/lib/validation";

const bodySchema = z.object({
  email: z.string().email().max(320).optional()
});

function normalizeClientIp(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("::ffff:")) return trimmed.slice("::ffff:".length);
  return trimmed;
}

function extractClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0] ?? "";
    return normalizeClientIp(first);
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return normalizeClientIp(realIp);
  return "";
}

function assertE2eRequestAllowed(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const secret = process.env.E2E_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "E2E_SECRET is not configured." }, { status: 500 });
  }

  const provided = req.headers.get("x-e2e-secret") ?? "";
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const allowlistRaw = process.env.INTERNAL_E2E_ALLOWED_IPS ?? "";
  const allowlist = new Set(
    allowlistRaw
      .split(",")
      .map((v) => normalizeClientIp(v))
      .filter(Boolean)
  );
  if (allowlist.size === 0) return null;

  const ip = extractClientIp(req);
  if (!ip || !allowlist.has(ip)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
}

function resolveE2eEmail(inputEmail: string | undefined): string {
  const value = (inputEmail ?? process.env.E2E_TEST_EMAIL ?? "e2e-clipped@example.com").trim().toLowerCase();
  return value;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const denied = assertE2eRequestAllowed(req);
  if (denied) {
    await recordApiMetricFromStart({
      route: "/api/internal/e2e/login",
      method: "POST",
      status: denied.status,
      startedAt
    });
    return denied;
  }

  const parsed = await parseJsonWithSchema(req, bodySchema);
  if (!parsed.ok) {
    await recordApiMetricFromStart({
      route: "/api/internal/e2e/login",
      method: "POST",
      status: parsed.response.status,
      startedAt
    });
    return parsed.response;
  }

  const email = resolveE2eEmail(parsed.data.email);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: "internal-e2e-auth-only"
    },
    select: {
      id: true,
      email: true
    }
  });

  const token = await issueSessionToken({
    userId: user.id,
    email: user.email,
    ttlSeconds: 60 * 60 * 24
  });
  const csrfToken = issueCsrfToken();

  const res = NextResponse.json(
    {
      ok: true,
      user: { id: user.id, email: user.email }
    },
    { status: 200 }
  );
  res.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24
  });
  res.cookies.set(getCsrfCookieName(), csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24
  });

  await recordApiMetricFromStart({
    route: "/api/internal/e2e/login",
    method: "POST",
    status: 200,
    startedAt,
    userId: user.id
  });
  return res;
}
