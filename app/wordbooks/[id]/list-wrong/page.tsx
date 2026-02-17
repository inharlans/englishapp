import Link from "next/link";
import { cookies } from "next/headers";

import { WordbookListClient } from "@/components/wordbooks/WordbookListClient";
import { getUserFromRequestCookies } from "@/lib/authServer";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export default async function WordbookListWrongPage(props: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequestCookies(await cookies());
  if (!user) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">단어장 목록</h1>
        <p className="text-sm text-slate-600">로그인이 필요합니다.</p>
      </section>
    );
  }

  const { id: idRaw } = await props.params;
  const id = parseId(idRaw);
  if (!id) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">잘못된 단어장입니다</h1>
        <Link href={{ pathname: "/wordbooks" }} className="text-sm font-semibold text-blue-700 hover:underline">
          뒤로
        </Link>
      </section>
    );
  }

  const allowed = await canAccessWordbookForStudy({ userId: user.id, wordbookId: id, userPlan: user.plan });
  if (!allowed) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">접근할 수 없습니다</h1>
        <p className="text-sm text-slate-600">먼저 이 단어장을 다운로드하세요.</p>
      </section>
    );
  }

  return <WordbookListClient wordbookId={id} mode="listWrong" title="오답 목록" />;
}


