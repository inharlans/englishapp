import { describe, expect, it } from "vitest";

import { checkRateLimitLocal, getClientIpFromHeaders } from "@/lib/rateLimit";

describe("checkRateLimitLocal", () => {
  it("allows up to limit within window and blocks after", () => {
    const now = 1_000_000;
    const key = "k";
    for (let i = 0; i < 3; i += 1) {
      expect(checkRateLimitLocal({ key, limit: 3, windowMs: 1000, nowMs: now })).toEqual({ ok: true });
    }
    const blocked = checkRateLimitLocal({ key, limit: 3, windowMs: 1000, nowMs: now });
    expect(blocked.ok).toBe(false);
  });

  it("resets after window", () => {
    const key = "k2";
    const first = checkRateLimitLocal({ key, limit: 1, windowMs: 1000, nowMs: 0 });
    expect(first).toEqual({ ok: true });
    const blocked = checkRateLimitLocal({ key, limit: 1, windowMs: 1000, nowMs: 0 });
    expect(blocked.ok).toBe(false);
    const after = checkRateLimitLocal({ key, limit: 1, windowMs: 1000, nowMs: 1000 });
    expect(after).toEqual({ ok: true });
  });
});

describe("getClientIpFromHeaders", () => {
  it("prefers first x-forwarded-for ip when present", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.10, 10.0.0.7 ",
      "cf-connecting-ip": "198.51.100.3",
      "x-real-ip": "192.0.2.8"
    });

    expect(getClientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("falls back to cf-connecting-ip then x-real-ip", () => {
    const cfHeaders = new Headers({
      "x-forwarded-for": "unknown",
      "cf-connecting-ip": "198.51.100.3",
      "x-real-ip": "192.0.2.8"
    });
    expect(getClientIpFromHeaders(cfHeaders)).toBe("198.51.100.3");

    const realIpHeaders = new Headers({
      "x-forwarded-for": "unknown",
      "x-real-ip": "192.0.2.8"
    });
    expect(getClientIpFromHeaders(realIpHeaders)).toBe("192.0.2.8");
  });
});
