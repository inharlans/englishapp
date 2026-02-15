import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const downloaded = await prisma.wordbookDownload.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      wordbook: {
        select: {
          id: true,
          title: true,
          description: true,
          fromLang: true,
          toLang: true,
          isPublic: true,
          downloadCount: true,
          ratingAvg: true,
          ratingCount: true,
          createdAt: true,
          updatedAt: true,
          owner: { select: { id: true, email: true } },
          _count: { select: { items: true } }
        }
      }
    }
  });

  return NextResponse.json(
    { wordbooks: downloaded.map((d) => ({ ...d.wordbook, downloadedAt: d.createdAt })) },
    { status: 200 }
  );
}

