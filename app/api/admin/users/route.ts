import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, isAdmin: true, plan: true, proUntil: true, createdAt: true }
  });

  return NextResponse.json({ users }, { status: 200 });
}

