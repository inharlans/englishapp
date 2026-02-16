import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserFromRequestCookies } from "@/lib/authServer";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";

function isPro(user: { plan: "FREE" | "PRO"; proUntil: Date | null }): boolean {
  if (user.plan !== "PRO") return false;
  if (!user.proUntil) return true;
  return user.proUntil.getTime() >= Date.now();
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const downloadsUsed = await prisma.wordbookDownload.count({
    where: { userId: user.id }
  });

  const pro = isPro(user);

  const res = NextResponse.json(
    {
      user: { id: user.id, email: user.email, isAdmin: user.isAdmin },
      plan: {
        code: pro ? "PRO" : "FREE",
        raw: user.plan,
        proUntil: user.proUntil,
        downloadsUsed,
        freeDownloadLimit: 3,
        freeDownloadsRemaining: pro ? null : Math.max(0, 3 - downloadsUsed),
        priceMonthlyKrw: 2900,
        priceYearlyKrw: 29000
      }
    },
    { status: 200 }
  );

  if (!req.cookies.get(getCsrfCookieName())?.value) {
    res.cookies.set(getCsrfCookieName(), issueCsrfToken(), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return res;
}
