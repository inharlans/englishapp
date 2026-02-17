import { describe, expect, it } from "vitest";

import { computeNextReviewAt } from "@/lib/scheduling";

describe("computeNextReviewAt", () => {
  it("adds 1 hour for streak <= 1", () => {
    const now = new Date("2026-02-15T00:00:00.000Z");
    expect(computeNextReviewAt(now, 0).toISOString()).toBe("2026-02-15T01:00:00.000Z");
    expect(computeNextReviewAt(now, 1).toISOString()).toBe("2026-02-15T01:00:00.000Z");
  });

  it("adds 1 day for streak 2", () => {
    const now = new Date("2026-02-15T00:00:00.000Z");
    expect(computeNextReviewAt(now, 2).toISOString()).toBe("2026-02-16T00:00:00.000Z");
  });

  it("adds 3 days for streak 3", () => {
    const now = new Date("2026-02-15T00:00:00.000Z");
    expect(computeNextReviewAt(now, 3).toISOString()).toBe("2026-02-18T00:00:00.000Z");
  });

  it("adds 7 days for streak 4", () => {
    const now = new Date("2026-02-15T00:00:00.000Z");
    expect(computeNextReviewAt(now, 4).toISOString()).toBe("2026-02-22T00:00:00.000Z");
  });

  it("adds 30 days for streak >= 5", () => {
    const now = new Date("2026-02-15T00:00:00.000Z");
    expect(computeNextReviewAt(now, 5).toISOString()).toBe("2026-03-17T00:00:00.000Z");
    expect(computeNextReviewAt(now, 10).toISOString()).toBe("2026-03-17T00:00:00.000Z");
  });
});
