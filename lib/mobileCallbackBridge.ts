import { NextRequest, NextResponse } from "next/server";

import { assertValidMobileRedirectUri, getFallbackMobileRedirectUri } from "@/lib/mobileRedirectUri";
import type { OAuthProvider } from "@/lib/mobileAuthSchemas";
import { verifyMobileState } from "@/lib/mobileState";

function appendIfPresent(url: URL, key: string, value: string | null): void {
  if (value) {
    url.searchParams.set(key, value);
  }
}

function redirectNoStore(target: URL): NextResponse {
  return NextResponse.redirect(target.toString(), {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache"
    }
  });
}

export async function handleMobileProviderCallback(
  req: NextRequest,
  provider: OAuthProvider
): Promise<NextResponse> {
  const fallbackRedirectUri = getFallbackMobileRedirectUri();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  const claims = state ? await verifyMobileState(state) : null;

  if (!claims?.redirectUri || claims.provider !== provider) {
    const fallback = new URL(fallbackRedirectUri);
    fallback.searchParams.set("error", "invalid_state");
    return redirectNoStore(fallback);
  }

  try {
    assertValidMobileRedirectUri(claims.redirectUri);
  } catch {
    const fallback = new URL(fallbackRedirectUri);
    fallback.searchParams.set("error", "invalid_state");
    return redirectNoStore(fallback);
  }

  let target: URL;
  try {
    target = new URL(claims.redirectUri);
  } catch {
    target = new URL(fallbackRedirectUri);
  }

  if (!code && !error) {
    target.searchParams.set("error", "invalid_request");
    if (state) {
      target.searchParams.set("state", state);
    }
    return redirectNoStore(target);
  }

  appendIfPresent(target, "code", code);
  if (state) {
    target.searchParams.set("state", state);
  }
  appendIfPresent(target, "error", error);
  appendIfPresent(target, "error_description", errorDescription);

  return redirectNoStore(target);
}
