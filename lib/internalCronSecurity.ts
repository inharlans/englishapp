import { NextRequest, NextResponse } from "next/server";

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

function parseAllowedIps(): Set<string> {
  const raw = process.env.INTERNAL_CRON_ALLOWED_IPS ?? "";
  const values = raw
    .split(",")
    .map((v) => normalizeClientIp(v))
    .filter(Boolean);
  return new Set(values);
}

export function assertInternalCronRequest(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const authorization = req.headers.get("authorization") ?? "";
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const allowedIps = parseAllowedIps();
  if (allowedIps.size === 0) return null;

  const clientIp = extractClientIp(req);
  if (!clientIp || !allowedIps.has(clientIp)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
}
