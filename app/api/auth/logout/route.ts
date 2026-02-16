import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName } from "@/lib/authJwt";
import { getCsrfCookieName } from "@/lib/csrf";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  res.cookies.set(getCsrfCookieName(), "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return res;
}
