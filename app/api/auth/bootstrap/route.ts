import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { parseJsonWithSchema } from "@/lib/validation";
import { AuthService } from "@/server/domain/auth/service";
import { z } from "zod";

const bootstrapSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(512)
});

const authService = new AuthService();

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `authBootstrap:${ip}`,
    limit: 5,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const token = process.env.AUTH_BOOTSTRAP_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Bootstrap disabled (missing AUTH_BOOTSTRAP_TOKEN)." },
      { status: 403 }
    );
  }

  const provided = req.headers.get("x-bootstrap-token") ?? "";
  if (provided !== token) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsed = await parseJsonWithSchema(req, bootstrapSchema);
  if (!parsed.ok) return parsed.response;

  const result = await authService.bootstrap(parsed.data);
  if (!result) {
    return NextResponse.json({ error: "Bootstrap already completed." }, { status: 409 });
  }

  return NextResponse.json(result);
}
