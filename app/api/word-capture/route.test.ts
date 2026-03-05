import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireTrustedUserMutation = vi.fn();
const mockCaptureWord = vi.fn();
const mockCaptureAppError = vi.fn();

vi.mock("@/lib/api/mutation-route", () => ({
  requireTrustedUserMutation: mockRequireTrustedUserMutation
}));

vi.mock("@/server/domain/clipper/service", () => ({
  ClipperService: class {
    captureWord = mockCaptureWord;
  }
}));

vi.mock("@/lib/observability", () => ({
  captureAppError: mockCaptureAppError
}));

describe("POST /api/word-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns guarded response when mutation guard fails", async () => {
    mockRequireTrustedUserMutation.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden." }), { status: 403 })
    });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/word-capture", {
        method: "POST",
        body: JSON.stringify({ rawText: "x", selectedWords: ["apple"] }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(403);
  });

  it("captures selected words and reports summary", async () => {
    mockRequireTrustedUserMutation.mockResolvedValue({ ok: true, user: { id: 7, email: "u@test.com" } });
    mockCaptureWord
      .mockResolvedValueOnce({ ok: true, payload: { status: "created" } })
      .mockResolvedValueOnce({ ok: true, payload: { status: "merged" } })
      .mockResolvedValueOnce({ ok: false, status: 409, error: "duplicate" });

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/word-capture", {
        method: "POST",
        body: JSON.stringify({ rawText: "source", selectedWords: ["apple", "banana", "carrot"] }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      savedCount: 1,
      duplicateCount: 2,
      failed: []
    });
  });

  it("returns 500 when capture service throws", async () => {
    mockRequireTrustedUserMutation.mockResolvedValue({ ok: true, user: { id: 7, email: "u@test.com" } });
    mockCaptureWord.mockRejectedValue(new Error("db down"));

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/word-capture", {
        method: "POST",
        body: JSON.stringify({ rawText: "source", selectedWords: ["apple"] }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(500);
    expect(mockCaptureAppError).toHaveBeenCalledTimes(1);
  });

  it("returns 200 with failed words when partial capture happens", async () => {
    mockRequireTrustedUserMutation.mockResolvedValue({ ok: true, user: { id: 7, email: "u@test.com" } });
    mockCaptureWord
      .mockResolvedValueOnce({ ok: true, payload: { status: "created" } })
      .mockResolvedValueOnce({ ok: false, status: 500, error: "internal" });

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/word-capture", {
        method: "POST",
        body: JSON.stringify({ rawText: "source", selectedWords: ["apple", "banana"] }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      savedCount: 1,
      duplicateCount: 0,
      failed: ["banana"]
    });
  });

  it("deduplicates selectedWords before capture", async () => {
    mockRequireTrustedUserMutation.mockResolvedValue({ ok: true, user: { id: 7, email: "u@test.com" } });
    mockCaptureWord.mockResolvedValue({ ok: true, payload: { status: "created" } });

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/word-capture", {
        method: "POST",
        body: JSON.stringify({ rawText: "source", selectedWords: ["apple", "apple", "apple"] }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(200);
    expect(mockCaptureWord).toHaveBeenCalledTimes(1);
  });
});
