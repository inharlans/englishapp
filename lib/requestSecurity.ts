import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";
import { getCsrfCookieName, getCsrfHeaderName } from "@/lib/csrf";
import { verifyMobileAccessToken } from "@/lib/mobileTokens";

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

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^\s*Bearer\s+(\S+)\s*$/i);
  return match?.[1] ?? null;
}

type MobileBearerRouteRule = {
  method: string;
  pattern: RegExp;
};

const MOBILE_BEARER_MUTATION_ALLOWLIST: MobileBearerRouteRule[] = [
  { method: "POST", pattern: /^\/api\/auth\/mobile\/(start|exchange|refresh)$/ },
  { method: "DELETE", pattern: /^\/api\/auth\/sessions\/[1-9]\d*$/ },
  { method: "DELETE", pattern: /^\/api\/blocked-owners$/ },
  { method: "POST", pattern: /^\/api\/payments\/(checkout|confirm|portal)$/ },
  { method: "POST", pattern: /^\/api\/clipper\/capture$/ },
  { method: "POST", pattern: /^\/api\/clipper\/candidates$/ },
  { method: "POST", pattern: /^\/api\/word-capture$/ },
  { method: "POST", pattern: /^\/api\/quiz\/submit$/ },
  { method: "POST", pattern: /^\/api\/translate$/ },
  { method: "PATCH", pattern: /^\/api\/users\/me\/clipper-settings$/ },
  { method: "PATCH", pattern: /^\/api\/users\/me\/study-preferences$/ },
  { method: "POST", pattern: /^\/api\/users\/me\/daily-goal$/ },
  { method: "POST", pattern: /^\/api\/wordbooks$/ },
  { method: "PATCH", pattern: /^\/api\/wordbooks\/[^/]+$/ },
  { method: "DELETE", pattern: /^\/api\/wordbooks\/[^/]+$/ },
  { method: "POST", pattern: /^\/api\/wordbooks\/[^/]+\/(block|download|import|publish|rate|report|sync-download)$/ },
  { method: "POST", pattern: /^\/api\/wordbooks\/[^/]+\/quiz\/submit$/ },
  { method: "POST", pattern: /^\/api\/wordbooks\/[^/]+\/items$/ },
  { method: "PATCH", pattern: /^\/api\/wordbooks\/[^/]+\/items\/[^/]+$/ },
  { method: "DELETE", pattern: /^\/api\/wordbooks\/[^/]+\/items\/[^/]+$/ },
  { method: "POST", pattern: /^\/api\/wordbooks\/[^/]+\/study\/items\/[^/]+$/ },
  { method: "POST", pattern: /^\/api\/words\/import$/ },
  { method: "PATCH", pattern: /^\/api\/words\/[^/]+$/ }
];

function isMobileBearerMutationPath(pathname: string, method: string): boolean {
  return MOBILE_BEARER_MUTATION_ALLOWLIST.some(
    (rule) => rule.method === method && rule.pattern.test(pathname)
  );
}

export async function assertTrustedMutationRequest(req: NextRequest): Promise<NextResponse | null> {
  const pathname = new URL(req.url).pathname;
  const token = extractBearerToken(req.headers.get("authorization"));
  const sessionToken = req.cookies.get(getSessionCookieName())?.value;
  const hasValidSessionCookie = Boolean(sessionToken && (await verifySessionToken(sessionToken)));
  const authMode = (req.headers.get("x-auth-mode") ?? "").trim().toLowerCase();
  const bearerMode = authMode === "bearer";

  const isAllowedMobileBearerRoute = isMobileBearerMutationPath(pathname, req.method.toUpperCase());

  if (token && !hasValidSessionCookie && (!isAllowedMobileBearerRoute || !bearerMode)) {
    return NextResponse.json({ error: "Bearer auth is not allowed on this route." }, { status: 403 });
  }

  if (token && !hasValidSessionCookie && isAllowedMobileBearerRoute && bearerMode) {
    const claims = await verifyMobileAccessToken(token);
    if (claims) {
      return null;
    }
  }

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

  if (hasValidSessionCookie) {
    const csrfCookie = req.cookies.get(getCsrfCookieName())?.value ?? "";
    const csrfHeader = req.headers.get(getCsrfHeaderName()) ?? "";
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
    }
  }

  return null;
}
