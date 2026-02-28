import { NextRequest, NextResponse } from "next/server";

import { errorJson } from "@/lib/api/service-response";
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
    return errorJson({
      status: 429,
      code: "RATE_LIMITED",
      message: "Too many requests.",
      headers: { "Retry-After": String(limit.retryAfterSeconds) }
    });
  }

  const token = process.env.AUTH_BOOTSTRAP_TOKEN;
  if (!token) {
    return errorJson({
      status: 403,
      code: "BOOTSTRAP_DISABLED",
      message: "Bootstrap disabled (missing AUTH_BOOTSTRAP_TOKEN)."
    });
  }

  const provided = req.headers.get("x-bootstrap-token") ?? "";
  if (provided !== token) {
    return errorJson({
      status: 403,
      code: "BOOTSTRAP_FORBIDDEN",
      message: "Forbidden."
    });
  }

  const parsed = await parseJsonWithSchema(req, bootstrapSchema);
  if (!parsed.ok) return parsed.response;

  const result = await authService.bootstrap(parsed.data);
  if (!result) {
    return errorJson({
      status: 409,
      code: "BOOTSTRAP_ALREADY_COMPLETED",
      message: "Bootstrap already completed."
    });
  }

  return NextResponse.json(result);
}
