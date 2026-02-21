import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName } from "@/lib/authJwt";
import { getCsrfCookieName, getCsrfHeaderName } from "@/lib/csrf";

function getExpectedHost(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host
  ).toLowerCase();
}

function parseHostFromUrl(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

export function assertTrustedMutationRequest(req: NextRequest): NextResponse | null {
  const secFetchSite = (req.headers.get("sec-fetch-site") ?? "").toLowerCase();
  if (secFetchSite === "cross-site") {
    return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }

  const expectedHost = getExpectedHost(req);
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const originHost = origin ? parseHostFromUrl(origin) : null;
  const refererHost = referer ? parseHostFromUrl(referer) : null;

  if (origin && !originHost) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  if (referer && !refererHost) {
    return NextResponse.json({ error: "Invalid referer." }, { status: 403 });
  }

  if (!originHost && !refererHost) {
    return NextResponse.json({ error: "Missing origin/referer." }, { status: 403 });
  }
  if ((originHost && originHost !== expectedHost) || (refererHost && refererHost !== expectedHost)) {
    return NextResponse.json({ error: "Origin mismatch." }, { status: 403 });
  }

  const hasSession = Boolean(req.cookies.get(getSessionCookieName())?.value);
  if (hasSession) {
    const csrfCookie = req.cookies.get(getCsrfCookieName())?.value ?? "";
    const csrfHeader = req.headers.get(getCsrfHeaderName()) ?? "";
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
    }
  }

  return null;
}
