import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";

export type RequestUser = NonNullable<Awaited<ReturnType<typeof getUserFromRequestCookies>>>;

export function parsePositiveIntParam(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function requireUserFromRequest(
  req: NextRequest
): Promise<{ ok: true; user: RequestUser } | { ok: false; response: NextResponse<{ error: string }> }> {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    };
  }
  return { ok: true, user };
}
