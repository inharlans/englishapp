import type { JWTPayload } from "jose";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "auth_session";

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET env var");
  }
  return new TextEncoder().encode(secret);
}

type SessionClaims = JWTPayload & {
  sub: string; // user id
  email: string;
};

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  // Works in both Node and Edge runtimes.
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export async function issueSessionToken(input: {
  userId: number;
  email: string;
  ttlSeconds: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jti = randomHex(16);

  return new SignJWT({ email: input.email } satisfies Omit<SessionClaims, "sub">)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + input.ttlSeconds)
    .setJti(jti)
    .setSubject(String(input.userId))
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"]
    });
    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }
    const email = (payload as SessionClaims).email;
    if (!email || typeof email !== "string") {
      return null;
    }
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

