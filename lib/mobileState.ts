import type { JWTPayload } from "jose";
import { SignJWT, jwtVerify } from "jose";

import type { OAuthProvider } from "@/lib/mobileAuthSchemas";

const MOBILE_STATE_TTL_SECONDS = 60 * 5;

function getMobileStateSecret(): Uint8Array {
  const secret = process.env.MOBILE_STATE_SECRET;
  if (!secret) {
    throw new Error("Missing MOBILE_STATE_SECRET env var");
  }
  return new TextEncoder().encode(secret);
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

type MobileStatePayload = JWTPayload & {
  provider: OAuthProvider;
  deviceId: string;
  redirectUri: string;
  providerRedirectUri: string;
  codeChallenge: string;
  nonce: string;
};

export type MobileStateClaims = {
  provider: OAuthProvider;
  deviceId: string;
  redirectUri: string;
  providerRedirectUri: string;
  codeChallenge: string;
  nonce: string;
};

export async function issueMobileState(input: {
  provider: OAuthProvider;
  deviceId: string;
  redirectUri: string;
  providerRedirectUri: string;
  codeChallenge: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    provider: input.provider,
    deviceId: input.deviceId,
    redirectUri: input.redirectUri,
    providerRedirectUri: input.providerRedirectUri,
    codeChallenge: input.codeChallenge,
    nonce: randomHex(16)
  } satisfies Omit<MobileStatePayload, keyof JWTPayload>;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + MOBILE_STATE_TTL_SECONDS)
    .setIssuer("mobile-oauth-state")
    .setAudience("mobile-oauth")
    .sign(getMobileStateSecret());
}

export async function verifyMobileState(state: string): Promise<MobileStateClaims | null> {
  try {
    const { payload } = await jwtVerify(state, getMobileStateSecret(), {
      algorithms: ["HS256"],
      issuer: "mobile-oauth-state",
      audience: "mobile-oauth"
    });

    const provider = payload.provider;
    const deviceId = payload.deviceId;
    const redirectUri = payload.redirectUri;
    const providerRedirectUri = payload.providerRedirectUri;
    const codeChallenge = payload.codeChallenge;
    const nonce = payload.nonce;

    if (provider !== "google" && provider !== "naver" && provider !== "kakao") {
      return null;
    }
    if (typeof deviceId !== "string" || deviceId.length < 8 || deviceId.length > 128) {
      return null;
    }
    if (typeof redirectUri !== "string" || !redirectUri) {
      return null;
    }
    const resolvedProviderRedirectUri =
      typeof providerRedirectUri === "string" && providerRedirectUri
        ? providerRedirectUri
        : redirectUri;
    if (
      typeof codeChallenge !== "string" ||
      codeChallenge.length < 43 ||
      codeChallenge.length > 128 ||
      !/^[A-Za-z0-9._~-]+$/.test(codeChallenge)
    ) {
      return null;
    }
    if (typeof nonce !== "string" || !nonce) {
      return null;
    }

    return {
      provider,
      deviceId,
      redirectUri,
      providerRedirectUri: resolvedProviderRedirectUri,
      codeChallenge,
      nonce
    };
  } catch {
    return null;
  }
}
