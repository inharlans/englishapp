import { describe, expect, it } from "vitest";

import { getEffectivePlan, isActiveProPlan } from "@/lib/userPlan";

describe("userPlan", () => {
  it("treats perpetual PRO as active", () => {
    expect(isActiveProPlan({ plan: "PRO", proUntil: null })).toBe(true);
    expect(getEffectivePlan({ plan: "PRO", proUntil: null })).toBe("PRO");
  });

  it("downgrades expired PRO to FREE effectively", () => {
    const nowMs = Date.parse("2026-02-18T00:00:00.000Z");
    const expired = new Date("2026-02-17T23:59:59.000Z");
    expect(isActiveProPlan({ plan: "PRO", proUntil: expired, nowMs })).toBe(false);
    expect(getEffectivePlan({ plan: "PRO", proUntil: expired, nowMs })).toBe("FREE");
  });

  it("keeps non-PRO as FREE", () => {
    const future = new Date("2030-01-01T00:00:00.000Z");
    expect(isActiveProPlan({ plan: "FREE", proUntil: future })).toBe(false);
    expect(getEffectivePlan({ plan: "FREE", proUntil: future })).toBe("FREE");
  });
});
