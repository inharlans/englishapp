import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionCookieName } from "@/lib/authJwt";
import { getCsrfCookieName, getCsrfHeaderName } from "@/lib/csrf";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

const { mockVerifyMobileAccessToken, mockVerifySessionToken } = vi.hoisted(() => ({
  mockVerifyMobileAccessToken: vi.fn(),
  mockVerifySessionToken: vi.fn()
}));

vi.mock("@/lib/authJwt", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authJwt")>();
  return {
    ...actual,
    verifySessionToken: mockVerifySessionToken
  };
});

vi.mock("@/lib/mobileTokens", () => ({
  verifyMobileAccessToken: mockVerifyMobileAccessToken
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySessionToken.mockResolvedValue({ sub: "1" });
  });

  it("blocks requests when both origin and referer are missing", async () => {
    const res = await assertTrustedMutationRequest(makeRequest());
    expect(res?.status).toBe(403);
  });

  it("blocks origin mismatch", async () => {
    const res = await assertTrustedMutationRequest(
      makeRequest({
        origin: "https://evil.example.com"
      })
    );
    expect(res?.status).toBe(403);
  });

  it("allows same-host session request with valid csrf", async () => {
    const res = await assertTrustedMutationRequest(
      makeRequest({
        origin: "https://www.oingapp.com",
        referer: "https://www.oingapp.com/pricing",
        withSession: true,
        csrfToken: "same-token"
      })
    );
    expect(res).toBeNull();
  });

  it("allows bearer-only mutation request for mobile path in bearer mode", async () => {
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 1 });

    const req = new NextRequest("https://www.oingapp.com/api/wordbooks", {
      method: "POST",
      headers: new Headers({
        host: "www.oingapp.com",
        authorization: "Bearer mobile-access",
        "x-auth-mode": "bearer"
      })
    });

    const res = await assertTrustedMutationRequest(req);
    expect(res).toBeNull();
  });

  it("does not bypass csrf when session cookie exists even with bearer mode", async () => {
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 1 });

    const req = new NextRequest("https://www.oingapp.com/api/wordbooks", {
      method: "POST",
      headers: new Headers({
        host: "www.oingapp.com",
        origin: "https://www.oingapp.com",
        authorization: "Bearer mobile-access",
        "x-auth-mode": "bearer",
        cookie: `${getSessionCookieName()}=session-value; ${getCsrfCookieName()}=csrf-cookie`
      })
    });

    const res = await assertTrustedMutationRequest(req);
    expect(res?.status).toBe(403);
  });

  it("does not bypass when method is not allowlisted", async () => {
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 1 });

    const req = new NextRequest("https://www.oingapp.com/api/wordbooks", {
      method: "GET",
      headers: new Headers({
        host: "www.oingapp.com",
        authorization: "Bearer mobile-access",
        "x-auth-mode": "bearer"
      })
    });

    const res = await assertTrustedMutationRequest(req);
    expect(res?.status).toBe(403);
  });

  it("blocks bearer mode on non-allowlisted mutation routes", async () => {
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 1 });

    const req = new NextRequest("https://www.oingapp.com/api/admin/reports/1", {
      method: "POST",
      headers: new Headers({
        host: "www.oingapp.com",
        origin: "https://www.oingapp.com",
        referer: "https://www.oingapp.com/dashboard",
        authorization: "Bearer mobile-access",
        "x-auth-mode": "bearer"
      })
    });

    const res = await assertTrustedMutationRequest(req);
    expect(res?.status).toBe(403);
  });

  it("allows valid bearer on allowlisted route when session cookie is stale", async () => {
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 1 });
    mockVerifySessionToken.mockResolvedValue(null);

    const req = new NextRequest("https://www.oingapp.com/api/wordbooks", {
      method: "POST",
      headers: new Headers({
        host: "www.oingapp.com",
        authorization: "Bearer mobile-access",
        "x-auth-mode": "bearer",
        cookie: `${getSessionCookieName()}=stale-token`
      })
    });

    const res = await assertTrustedMutationRequest(req);
    expect(res).toBeNull();
  });
});
