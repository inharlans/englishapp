import { NextRequest, NextResponse } from "next/server";

import { issueSessionToken, getSessionCookieName } from "@/lib/authJwt";
import { issueCsrfToken, getCsrfCookieName } from "@/lib/csrf";
import { getLocalDebugEmail, isLocalDebugBypassEnabledByHostname, normalizeSafeNextPath } from "@/lib/localDebug";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!isLocalDebugBypassEnabledByHostname(req.nextUrl.hostname)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const email = getLocalDebugEmail().trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true }
  });

  if (!user) {
    return NextResponse.json(
      {
        error: `Local debug user not found: ${email}. Run 'npm run local:market:setup' first.`
      },
      { status: 400 }
    );
  }

  const nextPath = normalizeSafeNextPath(req.nextUrl.searchParams.get("next"));
  const token = await issueSessionToken({
    userId: user.id,
    email: user.email,
    ttlSeconds: 60 * 60 * 24 * 30
  });
  const csrfToken = issueCsrfToken();

  const redirectUrl = req.nextUrl.clone();
  redirectUrl.pathname = nextPath;
  redirectUrl.search = "";

  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  res.cookies.set(getCsrfCookieName(), csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return res;
}
