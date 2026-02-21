import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { getSessionCookieName } from "@/lib/authJwt";
import { getCsrfCookieName, getCsrfHeaderName } from "@/lib/csrf";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

function makeRequest(input: {
  origin?: string;
  referer?: string;
  host?: string;
  forwardedHost?: string;
  secFetchSite?: string;
  withSession?: boolean;
  csrfToken?: string;
} = {}) {
  const headers = new Headers();
  headers.set("host", input.host ?? "www.oingapp.com");
  headers.set("sec-fetch-site", input.secFetchSite ?? "same-origin");
  if (input.forwardedHost) headers.set("x-forwarded-host", input.forwardedHost);
  if (input.origin) headers.set("origin", input.origin);
  if (input.referer) headers.set("referer", input.referer);

  if (input.withSession) {
    const csrf = input.csrfToken ?? "csrf-token-value";
    headers.set(
      "cookie",
      `${getSessionCookieName()}=session-value; ${getCsrfCookieName()}=${csrf}`
    );
    headers.set(getCsrfHeaderName(), csrf);
  }

  return new NextRequest("https://www.oingapp.com/api/test", {
    method: "POST",
    headers
  });
}

describe("assertTrustedMutationRequest", () => {
  it("blocks requests when both origin and referer are missing", () => {
    const res = assertTrustedMutationRequest(makeRequest());
    expect(res?.status).toBe(403);
  });

  it("blocks origin mismatch", () => {
    const res = assertTrustedMutationRequest(
      makeRequest({
        origin: "https://evil.example.com"
      })
    );
    expect(res?.status).toBe(403);
  });

  it("allows same-host session request with valid csrf", () => {
    const res = assertTrustedMutationRequest(
      makeRequest({
        origin: "https://www.oingapp.com",
        referer: "https://www.oingapp.com/pricing",
        withSession: true,
        csrfToken: "same-token"
      })
    );
    expect(res).toBeNull();
  });
});
