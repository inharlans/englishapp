import { NextRequest, NextResponse } from "next/server";
import { getPublicOrigin } from "@/lib/publicOrigin";

const PREVIEW_COOKIE_NAME = "preview_access";

function normalizeNextPath(raw: string | null): string {
  if (!raw || raw.trim().length === 0) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(req: NextRequest) {
  const expected = process.env.PREVIEW_ACCESS_TOKEN;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const nextPath = normalizeNextPath(req.nextUrl.searchParams.get("next"));

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Invalid preview token." }, { status: 401 });
  }

  const res = NextResponse.redirect(new URL(nextPath, getPublicOrigin(req)));
  res.cookies.set(PREVIEW_COOKIE_NAME, expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60
  });
  return res;
}
