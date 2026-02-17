import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { FREE_DOWNLOAD_WORD_LIMIT, getUserDownloadedWordCount } from "@/lib/planLimits";

function isPro(user: { plan: "FREE" | "PRO"; proUntil: Date | null }): boolean {
  if (user.plan !== "PRO") return false;
  if (!user.proUntil) return true;
  return user.proUntil.getTime() >= Date.now();
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const user = await getUserFromRequestCookies(req.cookies);
    if (!user) {
      const res = NextResponse.json({ user: null }, { status: 200 });
      await recordApiMetricFromStart({
        route: "/api/auth/me",
        method: "GET",
        status: 200,
        startedAt
      });
      return res;
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

    await recordApiMetricFromStart({
      route: "/api/auth/me",
      method: "GET",
      status: 200,
      startedAt,
      userId: user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/auth/me",
      message: "auth_me_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    await recordApiMetricFromStart({
      route: "/api/auth/me",
      method: "GET",
      status: 500,
      startedAt
    });
    return NextResponse.json({ error: "Failed to load current user." }, { status: 500 });
  }
}
