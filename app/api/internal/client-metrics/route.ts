import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";
import { logJson } from "@/lib/logger";
import { CLIENT_METRIC_NAMES, type ClientMetricName } from "@/lib/metrics/names";
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

function getAllowedOrigins(req: NextRequest): Set<string> {
  const origins = new Set<string>();
  origins.add(new URL(req.url).origin.toLowerCase());

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    const parsed = toOrigin(appUrl);
    if (parsed) origins.add(parsed);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return origins;
}

function isSameHostRequest(req: NextRequest): boolean {
  const allowedOrigins = getAllowedOrigins(req);

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const originValue = origin ? toOrigin(origin) : null;
  const refererValue = referer ? toOrigin(referer) : null;

  if (!originValue && !refererValue) return false;

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

  const token = req.cookies.get(getSessionCookieName())?.value;
  const claims = token ? await verifySessionToken(token) : null;
  if (!claims) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const limit = await checkRateLimit({
    key: `client-metrics:${claims.uid}:${ip}`,
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
