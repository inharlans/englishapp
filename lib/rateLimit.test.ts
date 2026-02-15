import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  it("allows up to limit within window and blocks after", () => {
    const now = 1_000_000;
    const key = "k";
    for (let i = 0; i < 3; i += 1) {
      expect(checkRateLimit({ key, limit: 3, windowMs: 1000, nowMs: now })).toEqual({ ok: true });
    }
    const blocked = checkRateLimit({ key, limit: 3, windowMs: 1000, nowMs: now });
    expect(blocked.ok).toBe(false);
  });

  it("resets after window", () => {
    const key = "k2";
    const first = checkRateLimit({ key, limit: 1, windowMs: 1000, nowMs: 0 });
    expect(first).toEqual({ ok: true });
    const blocked = checkRateLimit({ key, limit: 1, windowMs: 1000, nowMs: 0 });
    expect(blocked.ok).toBe(false);
    const after = checkRateLimit({ key, limit: 1, windowMs: 1000, nowMs: 1000 });
    expect(after).toEqual({ ok: true });
  });
});

