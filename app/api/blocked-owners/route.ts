import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema, zPositiveInt } from "@/lib/validation";

const unblockSchema = z.object({
  ownerId: zPositiveInt
});

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const blocks = await prisma.blockedOwner.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      ownerId: true,
      createdAt: true,
      owner: { select: { email: true } }
    }
  });
  return NextResponse.json({ blocks }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = await parseJsonWithSchema(req, unblockSchema);
  if (!parsed.ok) return parsed.response;

  await prisma.blockedOwner.deleteMany({
    where: { userId: user.id, ownerId: parsed.data.ownerId }
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}

