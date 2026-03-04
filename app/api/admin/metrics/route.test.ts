import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockRequireUserFromRequest = vi.fn();
const mockGetMetrics = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/server/domain/admin/service", () => ({
  AdminService: class {
    getMetrics = mockGetMetrics;
  }
}));

describe("GET /api/admin/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    });
    const { GET } = await import("./route");

    const res = await GET(new NextRequest("https://example.com/api/admin/metrics"));
    expect(res.status).toBe(401);
    expect(mockGetMetrics).not.toHaveBeenCalled();
  });

  it("passes clipper query options to admin service", async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      ok: true,
      user: { id: 1, email: "admin@test.com", isAdmin: true }
    });
    mockGetMetrics.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        since: "2026-03-01T00:00:00.000Z",
        routeStats: [],
        quizQuality: { wrongAnswers: 0, disputableWrongCount: 0, disputableWrongRate: 0 },
        slo: {
          apiSuccessRate: 100,
          apiSuccessTarget: 99.5,
          cronSuccessRate: 100,
          cronSuccessTarget: 99,
          coreP95LatencyMs: 0,
          coreP95LatencyTargetMs: 500,
          violations: []
        },
        recentErrors: [],
        clipper: null,
        marketQuality: {
          candidateTotal: 10,
          eligibleTotal: 10,
          curatedTotal: 4,
          dropReasons: [
            { reason: "ADMIN_HIDDEN", count: 2, pct: 20 },
            { reason: "NOT_PUBLIC", count: 1, pct: 10 },
            { reason: "BELOW_MIN_ITEM_COUNT", count: 2, pct: 20 },
            { reason: "LOW_RATING_COUNT", count: 1, pct: 10 },
            { reason: "LOW_DONE_RATIO", count: 2, pct: 20 }
          ]
        }
      }
    });

    const { GET } = await import("./route");
    const req = new NextRequest(
      "https://example.com/api/admin/metrics?clipperWindow=7d&clipperRefresh=true"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockGetMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ clipperWindow: "7d", clipperRefresh: true })
    );
  });

  it("returns 400 for invalid clipperWindow query", async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      ok: true,
      user: { id: 1, email: "admin@test.com", isAdmin: true }
    });

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("https://example.com/api/admin/metrics?clipperWindow=bogus"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ error: "Invalid clipperWindow." });
    expect(mockGetMetrics).not.toHaveBeenCalled();
  });

  it("returns stable snapshot when clipper payload exists", async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      ok: true,
      user: { id: 1, email: "admin@test.com", isAdmin: true }
    });
    mockGetMetrics.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        since: "2026-03-01T00:00:00.000Z",
        routeStats: [
          {
            route: "/api/internal/cron/clipper-enrichment",
            total: 33,
            status4xx: 0,
            status5xx: 1,
            avgLatencyMs: 211,
            p95LatencyMs: 420
          }
        ],
        quizQuality: { wrongAnswers: 0, disputableWrongCount: 0, disputableWrongRate: 0 },
        slo: {
          apiSuccessRate: 99.9,
          apiSuccessTarget: 99.5,
          cronSuccessRate: 99.1,
          cronSuccessTarget: 99,
          coreP95LatencyMs: 120,
          coreP95LatencyTargetMs: 500,
          violations: []
        },
        recentErrors: [],
        clipper: {
          ok: true,
          window: "24h",
          generatedAt: "2026-03-01T01:00:00.000Z",
          cache: { mode: "no-cache", hit: false, ttlSec: 0 },
          queue: {
            queued: 21,
            processing: 3,
            waitMs: { p50: 30000, p95: 120000 },
            processMs: { p50: 3400, p95: 19000 },
            throughputPerHour: 22.5
          },
          quality: {
            doneCount: 540,
            failedCount: 18,
            successRate: 0.9677,
            failureRate: 0.0323,
            retryRate: 0.2,
            retrySuccessRate: 0.71,
            terminalFailed: 4,
            partialDoneRate: 0.11
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
          topFailuresOthersCount: 2,
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
          cost: { cronCallCount: 26, charEstimate: 140000, tokenEstimate: 35000 },
          trend: { metric: "failedCount", curr: 18, prev: 12, delta: 6, pct: 0.5 },
          policy: { version: "2026-03-01.v1" },
          ux: { doneLatencyMs: { p95: 260000 } },
          series: {
            hourly: [{ hour: "2026-03-01T00:00:00.000Z", doneCount: 22, failedCount: 1 }]
          }
        },
        marketQuality: {
          candidateTotal: 420,
          eligibleTotal: 420,
          curatedTotal: 180,
          dropReasons: [
            { reason: "ADMIN_HIDDEN", count: 30, pct: 7.14 },
            { reason: "NOT_PUBLIC", count: 70, pct: 16.67 },
            { reason: "BELOW_MIN_ITEM_COUNT", count: 90, pct: 21.43 },
            { reason: "LOW_RATING_COUNT", count: 40, pct: 9.52 },
            { reason: "LOW_DONE_RATIO", count: 60, pct: 14.29 }
          ]
        }
      }
    });

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("https://example.com/api/admin/metrics?clipperWindow=24h&clipperRefresh=true"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchSnapshot();
  });
});
