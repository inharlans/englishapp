import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";
import { logJson } from "@/lib/logger";
import { CLIENT_METRIC_NAMES, type ClientMetricName } from "@/lib/metrics/names";
import { verifyMobileAccessToken } from "@/lib/mobileTokens";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";

const ALLOWED_METRICS = new Set(CLIENT_METRIC_NAMES);
const MAX_BODY_SIZE = 2048;

function toOrigin(input: string): string | null {
  try {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return new URL(input).origin.toLowerCase();
    }
    return new URL(`http://${input}`).origin.toLowerCase();
  } catch {
    return null;
  }
}

function toHost(input: string): string | null {
  try {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return new URL(input).host.toLowerCase();
    }
    return new URL(`http://${input}`).host.toLowerCase();
  } catch {
    return null;
  }
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    const parsed = toOrigin(appUrl);
    if (parsed) origins.add(parsed);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  const extra = process.env.NEXT_PUBLIC_APP_URLS;
  if (extra) {
    for (const part of extra.split(",")) {
      const parsed = toOrigin(part.trim());
      if (parsed) origins.add(parsed);
    }
  }
  return origins;
}

function isSameHostRequest(req: NextRequest): boolean {
  const allowedOrigins = getAllowedOrigins();
  const allowedHosts = new Set(Array.from(allowedOrigins, (origin) => toHost(origin)).filter(Boolean) as string[]);

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const originValue = origin ? toOrigin(origin) : null;
  const refererValue = referer ? toOrigin(referer) : null;
  const secFetchSite = (req.headers.get("sec-fetch-site") ?? "").toLowerCase();
  const requestHost = req.nextUrl.host.toLowerCase();

  if (!originValue && !refererValue) {
    return (secFetchSite === "same-origin" || !secFetchSite) && Boolean(requestHost && allowedHosts.has(requestHost));
  }

  if (originValue && !allowedOrigins.has(originValue)) return false;
  if (refererValue && !allowedOrigins.has(refererValue)) return false;

  return true;
}

function safeLogInfo(message: string, meta: Record<string, unknown>) {
  try {
    logJson("info", message, meta);
  } catch {
    console.info(JSON.stringify({ ts: new Date().toISOString(), level: "info", message, ...meta }));
  }
}

function normalizeShortText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function sanitizeMetricPayload(name: string, raw: unknown): Record<string, string> {
  const input = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  if (name === "metric.home_cta_click") {
    return {
      cta: normalizeShortText(input.cta, 64) ?? "unknown",
      page: normalizeShortText(input.page, 32) ?? "unknown"
    };
  }

  if (name === "metric.recap_next_action_click") {
    return {
      from: normalizeShortText(input.from, 64) ?? "unknown",
      suggestion: normalizeShortText(input.suggestion, 80) ?? "unknown"
    };
  }

  return {};
}

function isClientMetricName(value: string): value is ClientMetricName {
  return ALLOWED_METRICS.has(value as ClientMetricName);
}

function parseAuthMode(req: NextRequest): "session" | "bearer" | null {
  const mode = (req.headers.get("x-auth-mode") ?? "").trim().toLowerCase();
  if (mode === "session" || mode === "bearer") {
    return mode;
  }
  return null;
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^\s*Bearer\s+(\S+)\s*$/i);
  return match?.[1] ?? null;
}

function toPositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

async function verifyMobileAccessTokenNoThrow(token: string): Promise<{ userId: number } | null> {
  try {
    const claims = await verifyMobileAccessToken(token);
    if (!claims) {
      return null;
    }

    const userId = toPositiveInt(claims.userId);
    if (!userId) {
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}

async function getAuthenticatedUserId(req: NextRequest): Promise<number | null> {
  const bearerToken = extractBearerToken(req.headers.get("authorization"));
  const authMode = parseAuthMode(req);

  const sessionToken = req.cookies.get(getSessionCookieName())?.value;
  let sessionClaims: Awaited<ReturnType<typeof verifySessionToken>> = null;
  if (sessionToken) {
    try {
      sessionClaims = await verifySessionToken(sessionToken);
    } catch {
      sessionClaims = null;
    }
  }
  const sessionClaimUserId =
    sessionClaims && typeof sessionClaims === "object"
      ? ((sessionClaims as { uid?: unknown; sub?: unknown }).uid ??
        (sessionClaims as { uid?: unknown; sub?: unknown }).sub)
      : undefined;
  const sessionUserId = toPositiveInt(sessionClaimUserId);
  const hasSessionUserId = sessionUserId !== null;

  if (hasSessionUserId && !bearerToken) {
    return Math.floor(sessionUserId);
  }

  if (hasSessionUserId && bearerToken) {
    if (authMode !== "bearer") {
      return null;
    }

    const bearerClaims = await verifyMobileAccessTokenNoThrow(bearerToken);
    if (!bearerClaims) {
      return null;
    }

    if (bearerClaims.userId !== sessionUserId) {
      return null;
    }

    return sessionUserId;
  }

  if (bearerToken && authMode === "bearer") {
    const bearerClaims = await verifyMobileAccessTokenNoThrow(bearerToken);
    return bearerClaims ? bearerClaims.userId : null;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  const preAuthLimit = await checkRateLimit({
    key: `client-metrics:preauth:${ip}`,
    limit: 120,
    windowMs: 60_000
  });
  if (!preAuthLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(preAuthLimit.retryAfterSeconds) } }
    );
  }

  const authenticatedUserId = await getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const limit = await checkRateLimit({
    key: `client-metrics:${authenticatedUserId}:${ip}`,
    limit: 60,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  if (!isSameHostRequest(req)) {
    return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 400 });
  }

  let raw = "";
  const contentLength = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
  }

  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  if (!raw) {
    return NextResponse.json({ ok: false, error: "Empty body." }, { status: 400 });
  }

  if (new TextEncoder().encode(raw).length > MAX_BODY_SIZE) {
    return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed JSON." }, { status: 400 });
  }

  const name = typeof (body as { name?: unknown }).name === "string" ? (body as { name: string }).name : "";
  if (!isClientMetricName(name)) {
    return NextResponse.json({ ok: false, error: "Unsupported metric." }, { status: 400 });
  }

  const tsRaw = (body as { ts?: unknown }).ts;
  const now = Date.now();
  const maxSkewMs = 10 * 60 * 1000;
  const ts =
    typeof tsRaw === "number" && Number.isFinite(tsRaw) && Math.abs(tsRaw - now) <= maxSkewMs
      ? tsRaw
      : now;
  const payload = sanitizeMetricPayload(name, (body as { payload?: unknown }).payload);

  safeLogInfo("client_metric", {
    route: "/api/internal/client-metrics",
    name,
    ts,
    payload
  });

  return NextResponse.json({ ok: true });
}
