import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUserFromRequestCookies = vi.fn();
const mockGetUserFromRequest = vi.fn();
const mockFindMany = vi.fn();
const mockMaskEmailAddress = vi.fn((email: string) => `masked:${email}`);

vi.mock("@/lib/authServer", () => ({
  getUserFromRequestCookies: mockGetUserFromRequestCookies,
  getUserFromRequest: mockGetUserFromRequest
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wordbookReport: {
      findMany: mockFindMany
    }
  }
}));

vi.mock("@/lib/textQuality", () => ({
  maskEmailAddress: mockMaskEmailAddress
}));

function makeReq() {
  return { cookies: { get: vi.fn() } } as never;
}

describe("GET /api/admin/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    const { GET } = await import("./route");

    const res = await GET(makeReq());
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized.");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not admin", async () => {
    mockGetUserFromRequest.mockResolvedValue({
      id: 10,
      email: "member@test.com",
      isAdmin: false
    });
    const { GET } = await import("./route");

    const res = await GET(makeReq());
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden.");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns reports for admin", async () => {
    mockGetUserFromRequest.mockResolvedValue({
      id: 1,
      email: "admin@test.com",
      isAdmin: true
    });
    mockFindMany.mockResolvedValue([
      {
        id: 99,
        reason: "SPAM",
        detail: "detail",
        status: "OPEN",
        reporterTrustScore: -1,
        createdAt: new Date(),
        reviewedAt: null,
        moderatorNote: null,
        reviewAction: null,
        previousStatus: null,
        nextStatus: null,
        reviewerIpHash: null,
        reporter: { id: 101, email: "reporter@test.com" },
        reviewedBy: { id: 202, email: "reviewer@test.com" },
        wordbook: {
          id: 303,
          title: "wb",
          isPublic: true,
          hiddenByAdmin: true,
          owner: { id: 404, email: "owner@test.com" }
        }
      }
    ]);
    const { GET } = await import("./route");

    const res = await GET(makeReq());
    const body = (await res.json()) as { reports: Array<{ qualityScore: number }> };

    expect(res.status).toBe(200);
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0]?.qualityScore).toBe(35);
    expect(mockMaskEmailAddress).toHaveBeenCalled();
  });
});
