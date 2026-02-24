import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";

const patchBodySchema = z.object({
  defaultWordbookId: z.number().int().positive().nullable()
});

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { defaultWordbookId: true }
  });

  return NextResponse.json(
    {
      defaultWordbookId: row?.defaultWordbookId ?? null
    },
    { status: 200 }
  );
}

export async function PATCH(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = await parseJsonWithSchema(req, patchBodySchema);
  if (!parsed.ok) return parsed.response;

  const requestedWordbookId = parsed.data.defaultWordbookId;
  if (requestedWordbookId !== null) {
    const owned = await prisma.wordbook.findFirst({
      where: { id: requestedWordbookId, ownerId: user.id },
      select: { id: true }
    });
    if (!owned) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultWordbookId: requestedWordbookId }
  });

  return NextResponse.json({ ok: true, defaultWordbookId: requestedWordbookId }, { status: 200 });
}
