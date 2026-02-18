import { describe, expect, it } from "vitest";

import {
  computeNextProUntil,
  computeNextScheduleAt,
  entitlementEventId
} from "@/lib/paymentsEntitlement";

describe("paymentsEntitlement", () => {
  it("uses a stable entitlement marker id", () => {
    expect(entitlementEventId("abc123")).toBe("portone-paid:abc123");
  });

  it("extends from now when PRO is expired", () => {
    const now = new Date("2026-02-18T00:00:00.000Z");
    const expired = new Date("2026-02-01T00:00:00.000Z");
    const next = computeNextProUntil({
      now,
      currentProUntil: expired,
      cycle: "monthly"
    });
    expect(next.toISOString()).toBe("2026-03-20T00:00:00.000Z");
  });

  it("extends from current proUntil when still active", () => {
    const now = new Date("2026-02-18T00:00:00.000Z");
    const activeUntil = new Date("2026-03-01T00:00:00.000Z");
    const next = computeNextProUntil({
      now,
      currentProUntil: activeUntil,
      cycle: "monthly"
    });
    expect(next.toISOString()).toBe("2026-03-31T00:00:00.000Z");
  });

  it("schedules at nextProUntil boundary (no extra cycle lag)", () => {
    const nextProUntil = new Date("2026-03-31T00:00:00.000Z");
    expect(computeNextScheduleAt(nextProUntil).toISOString()).toBe(
      "2026-03-31T00:00:00.000Z"
    );
  });
});
