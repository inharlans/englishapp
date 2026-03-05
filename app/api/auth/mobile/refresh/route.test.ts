import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { MobileAuthError } from "@/lib/mobileAuthErrors";

const mockRotateRefreshToken = vi.fn();
const mockIssueMobileAccessToken = vi.fn();
const mockValidateRefreshTokenSubject = vi.fn();
const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();

vi.mock("@/lib/mobileTokens", () => ({
  rotateRefreshToken: mockRotateRefreshToken,
  issueMobileAccessToken: mockIssueMobileAccessToken,
  validateRefreshTokenSubject: mockValidateRefreshTokenSubject
}));

vi.mock("@/lib/observability", () => ({
  recordApiMetricFromStart: mockRecordApiMetricFromStart,
  captureAppError: mockCaptureAppError
}));

describe("POST /api/auth/mobile/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateRefreshTokenSubject.mockResolvedValue({
      userId: 1,
      email: "user@test.com"
    });
  });

  it("returns new access/refresh pair on successful rotation", async () => {
    mockRotateRefreshToken.mockResolvedValue({
      userId: 1,
      email: "user@test.com",
      deviceId: "device-12345",
      newRefreshToken: "new-refresh-token",
      newRefreshExpiresAt: new Date()
    });
    mockIssueMobileAccessToken.mockResolvedValue("mobile-access-token");

    const { POST } = await import("./route");

    const res = await POST(
      new NextRequest("http://localhost/api/auth/mobile/refresh", {
        method: "POST",
        body: JSON.stringify({
          refreshToken: "r".repeat(32),
          deviceId: "device-12345"
        })
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      accessToken: "mobile-access-token",
      refreshToken: "new-refresh-token"
    });
    expect(mockIssueMobileAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        email: "user@test.com",
        deviceId: "device-12345"
      })
    );
  });

  it("returns AUTH_REFRESH_CONCURRENT when replay/concurrency is detected", async () => {
    mockRotateRefreshToken.mockRejectedValue(
      new MobileAuthError(409, "AUTH_REFRESH_CONCURRENT", "already used refresh token")
    );

    const { POST } = await import("./route");

    const res = await POST(
      new NextRequest("http://localhost/api/auth/mobile/refresh", {
        method: "POST",
        body: JSON.stringify({
          refreshToken: "r".repeat(32),
          deviceId: "device-12345"
        })
      })
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      errorCode: "AUTH_REFRESH_CONCURRENT"
    });
  });

  it("returns AUTH_REFRESH_INVALID for invalid token or device mismatch", async () => {
    mockRotateRefreshToken.mockRejectedValue(
      new MobileAuthError(401, "AUTH_REFRESH_INVALID", "invalid token or device")
    );

    const { POST } = await import("./route");

    const res = await POST(
      new NextRequest("http://localhost/api/auth/mobile/refresh", {
        method: "POST",
        body: JSON.stringify({
          refreshToken: "r".repeat(32),
          deviceId: "wrong-device"
        })
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      errorCode: "AUTH_REFRESH_INVALID"
    });
  });

  it("returns AUTH_REFRESH_INVALID when rotated session has invalid device id", async () => {
    mockRotateRefreshToken.mockResolvedValue({
      userId: 1,
      email: "user@test.com",
      deviceId: "short",
      newRefreshToken: "new-refresh-token",
      newRefreshExpiresAt: new Date()
    });

    const { POST } = await import("./route");

    const res = await POST(
      new NextRequest("http://localhost/api/auth/mobile/refresh", {
        method: "POST",
        body: JSON.stringify({
          refreshToken: "r".repeat(32),
          deviceId: "device-12345"
        })
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      errorCode: "AUTH_REFRESH_INVALID"
    });
  });
});
