import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { FREE_DOWNLOAD_WORD_LIMIT, getUserDownloadedWordCount } from "@/lib/planLimits";

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

  const downloadWordsUsed = await getUserDownloadedWordCount(user.id);

  const pro = isPro(user);

  const res = NextResponse.json(
    {
      user: { id: user.id, email: user.email, isAdmin: user.isAdmin, dailyGoal: user.dailyGoal },
      plan: {
        code: pro ? "PRO" : "FREE",
        raw: user.plan,
        proUntil: user.proUntil,
        downloadWordsUsed,
        freeDownloadWordLimit: FREE_DOWNLOAD_WORD_LIMIT,
        freeDownloadWordsRemaining: pro ? null : Math.max(0, FREE_DOWNLOAD_WORD_LIMIT - downloadWordsUsed),
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
