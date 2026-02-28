import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAssertInternalCronRequest = vi.fn();
const mockReturnWithMetric = vi.fn();
const mockGetClipperMetrics = vi.fn();

vi.mock("@/lib/internalCronSecurity", () => ({
  assertInternalCronRequest: mockAssertInternalCronRequest
}));

vi.mock("@/lib/api/metric-response", () => ({
  returnWithMetric: mockReturnWithMetric
}));

vi.mock("@/server/domain/internal/service", () => ({
  InternalService: class {
    getClipperMetrics = mockGetClipperMetrics;
  }
}));

describe("GET /api/internal/ops/clipper-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertInternalCronRequest.mockReturnValue(null);
    mockReturnWithMetric.mockImplementation(async ({ response }) => response);
  });

  it("returns stable snapshot for empty metrics payload", async () => {
    mockGetClipperMetrics.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        ok: true,
        window: "24h",
        generatedAt: "2026-03-01T00:00:00.000Z",
        cache: { mode: "no-cache", hit: false, ttlSec: 0 },
        queue: {
          queued: 0,
          processing: 0,
          waitMs: { p50: 0, p95: 0 },
          processMs: { p50: 0, p95: 0 },
          throughputPerHour: 0
        },
        quality: {
          doneCount: 0,
          failedCount: 0,
          successRate: 0,
          failureRate: 0,
          retryRate: 0,
          retrySuccessRate: 0,
          terminalFailed: 0,
          partialDoneRate: 0
        },
        failureReasons: [],
        topFailures: [],
        topFailuresOthersCount: 0,
        alerts: [],
        cost: {
          cronCallCount: 0,
          charEstimate: 0,
          tokenEstimate: 0
        },
        trend: {
          metric: "failedCount",
          curr: 0,
          prev: 0,
          delta: 0,
          pct: null
        },
        policy: {
          version: "2026-03-01.v1"
        },
        ux: {
          doneLatencyMs: { p95: 0 }
        },
        series: { hourly: [] }
      }
    });

    const { GET } = await import("./route");
    const req = new NextRequest("https://example.com/api/internal/ops/clipper-metrics");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchSnapshot();
  });

  it("returns stable snapshot for populated metrics payload", async () => {
    mockGetClipperMetrics.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        ok: true,
        window: "1h",
        generatedAt: "2026-03-01T00:10:00.000Z",
        cache: { mode: "ttl-5m", hit: true, ttlSec: 300 },
        queue: {
          queued: 120,
          processing: 12,
          waitMs: { p50: 32000, p95: 190000 },
          processMs: { p50: 4100, p95: 28000 },
          throughputPerHour: 88.5
        },
        quality: {
          doneCount: 540,
          failedCount: 18,
          successRate: 0.9677,
          failureRate: 0.0323,
          retryRate: 0.21,
          retrySuccessRate: 0.7,
          terminalFailed: 4,
          partialDoneRate: 0.12
        },
        failureReasons: [
          { code: "RATE_LIMIT", count: 7 },
          { code: "PARSE_ERROR", count: 5 },
          { code: "TIMEOUT", count: 3 }
        ],
        topFailures: [
          { code: "RATE_LIMIT", count: 7 },
          { code: "PARSE_ERROR", count: 5 },
          { code: "TIMEOUT", count: 3 }
        ],
        topFailuresOthersCount: 0,
        alerts: [
          {
            level: "warn",
            key: "success_rate",
            message: "성공률이(가) 경고 임계치 이하입니다.",
            value: 0.9677,
            warn: 0.97,
            critical: 0.9,
            window: "30m"
          }
        ],
        cost: {
          cronCallCount: 22,
          charEstimate: 140000,
          tokenEstimate: 35000
        },
        trend: {
          metric: "failedCount",
          curr: 18,
          prev: 12,
          delta: 6,
          pct: 0.5
        },
        policy: {
          version: "2026-03-01.v1"
        },
        ux: {
          doneLatencyMs: { p95: 260000 }
        },
        series: {
          hourly: [{ hour: "2026-03-01T00:00:00.000Z", doneCount: 88, failedCount: 2 }]
        }
      }
    });

    const { GET } = await import("./route");
    const req = new NextRequest(
      "https://example.com/api/internal/ops/clipper-metrics?window=1h&includeSeries=true&refresh=true"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchSnapshot();
    expect(mockGetClipperMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ window: "1h", includeSeries: true, refresh: true })
    );
  });

  it("returns 400 for invalid window query", async () => {
    const { GET } = await import("./route");
    const req = new NextRequest("https://example.com/api/internal/ops/clipper-metrics?window=bogus");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ error: "Invalid window." });
    expect(mockGetClipperMetrics).not.toHaveBeenCalled();
  });
});
