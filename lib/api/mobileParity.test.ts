import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/base";
import {
  captureWords,
  extractClipperCandidates,
  fetchMobileSessions,
  revokeMobileSession
} from "@/lib/api/mobileParity";

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn()
}));

vi.mock("@/lib/clientApi", () => ({
  apiFetch: mockApiFetch
}));

describe("mobileParity API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sessions for valid auth sessions response", async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          sessions: [
            {
              id: "101",
              platform: "MOBILE",
              deviceLabel: "dev***01",
              createdAt: new Date().toISOString(),
              isCurrent: true
            }
          ]
        }),
        { status: 200 }
      )
    );

    const result = await fetchMobileSessions();
    const [firstSession] = result.sessions;

    expect(result.sessions).toHaveLength(1);
    expect(firstSession).toBeDefined();
    expect(firstSession?.id).toBe("101");
    expect(mockApiFetch).toHaveBeenCalledWith("/api/auth/sessions", { method: "GET" });
  });

  it("throws API_CONTRACT_INVALID when sessions response shape drifts", async () => {
    mockApiFetch.mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));

    await expect(fetchMobileSessions()).rejects.toMatchObject({
      name: "ApiError",
      code: "API_CONTRACT_INVALID",
      source: "mobileParity.sessions"
    } satisfies Partial<ApiError>);
  });

  it("filters non-mobile sessions without failing contract", async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          sessions: [
            {
              id: "1",
              platform: "WEB",
              deviceLabel: "web",
              createdAt: new Date().toISOString(),
              isCurrent: false
            },
            {
              id: "2",
              platform: "MOBILE",
              deviceLabel: "mob",
              createdAt: new Date().toISOString(),
              isCurrent: true
            }
          ]
        }),
        { status: 200 }
      )
    );

    const result = await fetchMobileSessions();
    const [firstSession] = result.sessions;

    expect(result.sessions).toHaveLength(1);
    expect(firstSession).toBeDefined();
    expect(firstSession?.platform).toBe("MOBILE");
    expect(firstSession?.id).toBe("2");
  });

  it("returns revoke payload for valid delete-session response", async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          revokedCount: 1,
          accessTokenRevoked: false,
          accessTokenTtlSeconds: 900
        }),
        { status: 200 }
      )
    );

    const result = await revokeMobileSession(42);

    expect(result.revokedCount).toBe(1);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/auth/sessions/42", { method: "DELETE" });
  });

  it("fills revoke access token fields when omitted", async () => {
    mockApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          revokedCount: 1
        }),
        { status: 200 }
      )
    );

    await expect(revokeMobileSession(42)).resolves.toEqual({
      ok: true,
      revokedCount: 1,
      accessTokenRevoked: false,
      accessTokenTtlSeconds: 900
    });
  });

  it("throws API_CONTRACT_INVALID when candidates response shape drifts", async () => {
    mockApiFetch.mockResolvedValue(new Response(JSON.stringify({ candidates: [1, 2, 3] }), { status: 200 }));

    await expect(extractClipperCandidates("apple banana")).rejects.toMatchObject({
      name: "ApiError",
      code: "API_CONTRACT_INVALID",
      source: "mobileParity.clipperCandidates"
    } satisfies Partial<ApiError>);
  });

  it("defaults failed to empty array when omitted in word capture response", async () => {
    mockApiFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, savedCount: 1, duplicateCount: 0 }), { status: 200 })
    );

    await expect(captureWords(["apple"])).resolves.toEqual({
      ok: true,
      savedCount: 1,
      duplicateCount: 0,
      failed: []
    });
  });
});
