import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/authServer";

export type RequestUser = NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>;

export function parsePositiveIntParam(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function requireUserFromRequest(
  req: NextRequest
): Promise<{ ok: true; user: RequestUser } | { ok: false; response: NextResponse<{ error: string }> }> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    };
  }
  return { ok: true, user };
}
