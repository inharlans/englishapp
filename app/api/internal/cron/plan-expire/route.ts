import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const now = new Date();
  const expiredUsers = await prisma.user.findMany({
    where: {
      plan: "PRO",
      proUntil: { not: null, lt: now }
    },
    select: { id: true }
  });

  const result = await prisma.user.updateMany({
    where: {
      id: { in: expiredUsers.map((u) => u.id) }
    },
    data: {
      plan: "FREE",
      stripeSubscriptionStatus: "expired"
    }
  });

  return NextResponse.json(
    {
      ok: true,
      expiredCount: result.count,
      ranAt: now.toISOString()
    },
    { status: 200 }
  );
}
