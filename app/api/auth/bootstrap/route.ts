import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { hashPassword } from "@/lib/password";

type BootstrapBody = {
  email?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  const limit = checkRateLimit({
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

  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    return NextResponse.json({ error: "Bootstrap already completed." }, { status: 409 });
  }

  const body = (await req.json()) as BootstrapBody;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "email and password(>=8 chars) are required." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true }
  });

  return NextResponse.json({ ok: true, user });
}

