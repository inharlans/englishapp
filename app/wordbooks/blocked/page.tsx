import Link from "next/link";
import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { maskEmailAddress } from "@/lib/textQuality";
import { UnblockOwnerButton } from "./unblockOwnerButton";

export default async function BlockedOwnersPage() {
  const formatDateKst = (date: Date) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);

  const user = await getUserFromRequestCookies(await cookies());
  if (!user) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-black text-slate-900">차단 목록</h1>
        <p className="text-sm text-slate-600">로그인이 필요합니다.</p>
        <Link href={{ pathname: "/login", query: { next: "/wordbooks/blocked" } }} className="text-sm font-semibold text-blue-700 hover:underline">
          로그인하러 가기
        </Link>
      </section>
    );
  }

  const blocks = await prisma.blockedOwner.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      ownerId: true,
      createdAt: true,
      owner: { select: { email: true } }
    }
  });

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">차단 목록</h1>
        <p className="text-sm text-slate-600">
          차단한 제작자는 마켓에서 숨겨집니다. 언제든 해제할 수 있습니다.
        </p>
        <Link href="/wordbooks" className="text-sm font-semibold text-blue-700 hover:underline">
          내 단어장으로
        </Link>
      </header>

      {blocks.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600" role="status" aria-live="polite">
          차단한 제작자가 없습니다.
        </p>
      ) : (
        <div className="grid gap-3" role="list" aria-label="차단한 제작자 목록">
          {blocks.map((b) => (
            <div key={b.ownerId} className="rounded-2xl border border-slate-200 bg-white p-4" role="listitem">
              <p className="text-sm font-black text-slate-900">#{b.ownerId} {maskEmailAddress(b.owner.email)}</p>
              <p className="mt-1 text-xs text-slate-500">
                차단일 {formatDateKst(b.createdAt)}
              </p>
              <div className="mt-3">
                <UnblockOwnerButton ownerId={b.ownerId} ownerEmail={maskEmailAddress(b.owner.email)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


