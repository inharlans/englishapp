import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUserFromRequest = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIpFromHeaders = vi.fn();
const mockList = vi.fn();

vi.mock("@/lib/authServer", () => ({
  getUserFromRequest: mockGetUserFromRequest
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIpFromHeaders: mockGetClientIpFromHeaders
}));

vi.mock("@/server/domain/wordbook/market-service", () => ({
  parseMarketSort: (raw: string | null) => {
    if (raw === "new" || raw === "downloads" || raw === "top") return raw;
    return "top";
  },
  parseMarketQuality: (raw: string | null) => {
    if (raw === "all" || raw === "curated") return raw;
    return "all";
  },
  WordbookMarketService: class {
    list = mockList;
  }
}));

describe("GET /api/wordbooks/market", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRAWLER_LOCKDOWN_MODE = "off";

    mockGetUserFromRequest.mockResolvedValue({ id: 1, email: "user@test.com" });
    mockGetClientIpFromHeaders.mockReturnValue("127.0.0.1");
    mockCheckRateLimit.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
    mockList.mockResolvedValue({ total: 0, page: 0, take: 30, sort: "top", quality: "all", q: "", wordbooks: [] });
  });

  it("defaults quality to all when omitted", async () => {
    const { GET } = await import("./route");
    const req = new Request("https://www.oingapp.com/api/wordbooks/market?q=abc&sort=top") as never;

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockList).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ q: "abc", sort: "top", quality: "all" })
    );
  });

  it("passes curated quality when requested", async () => {
    const { GET } = await import("./route");
    const req = new Request("https://www.oingapp.com/api/wordbooks/market?quality=curated&sort=downloads") as never;

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockList).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sort: "downloads", quality: "curated" })
    );
  });

  it("falls back to all for invalid quality", async () => {
    const { GET } = await import("./route");
    const req = new Request("https://www.oingapp.com/api/wordbooks/market?quality=invalid") as never;

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockList).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ quality: "all" })
    );
  });
});
