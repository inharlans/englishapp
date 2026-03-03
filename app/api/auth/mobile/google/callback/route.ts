import { NextRequest, NextResponse } from "next/server";

import { assertValidMobileRedirectUri, getFallbackMobileRedirectUri } from "@/lib/mobileRedirectUri";
import { verifyMobileState } from "@/lib/mobileState";

function appendIfPresent(url: URL, key: string, value: string | null): void {
  if (value) {
    url.searchParams.set(key, value);
  }
}

export async function GET(req: NextRequest) {
  const fallbackRedirectUri = getFallbackMobileRedirectUri();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  const claims = state ? await verifyMobileState(state) : null;

  if (!claims?.redirectUri || claims.provider !== "google") {
    const fallback = new URL(fallbackRedirectUri);
    fallback.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(fallback.toString(), 302);
  }

  try {
    assertValidMobileRedirectUri(claims.redirectUri);
  } catch {
    const fallback = new URL(fallbackRedirectUri);
    fallback.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(fallback.toString(), 302);
  }

  const appRedirectUri = claims.redirectUri;
  let target: URL;
  try {
    target = new URL(appRedirectUri);
  } catch {
    target = new URL(fallbackRedirectUri);
  }

  if (!code && !error) {
    target.searchParams.set("error", "invalid_request");
    if (state) {
      target.searchParams.set("state", state);
    }
    return NextResponse.redirect(target.toString(), 302);
  }

  appendIfPresent(target, "code", code);
  if (state) {
    target.searchParams.set("state", state);
  }
  appendIfPresent(target, "error", error);
  appendIfPresent(target, "error_description", errorDescription);

  return NextResponse.redirect(target.toString(), 302);
}
