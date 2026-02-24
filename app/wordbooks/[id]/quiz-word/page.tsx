import Link from "next/link";
import { cookies, headers } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { isLocalDebugBypassEnabledByHostHeader } from "@/lib/localDebug";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";
import { WordbookQuizClient } from "../quiz/quizClient";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export default async function WordbookQuizWordPage(props: { params: Promise<{ id: string }> }) {
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

  const user = await getUserFromRequestCookies(await cookies());
  if (!user) {
    const hostHeader = (await headers()).get("host");
    const localDebugEnabled = isLocalDebugBypassEnabledByHostHeader(hostHeader);
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">단어장 퀴즈</h1>
        <p className="text-sm text-slate-600">로그인이 필요합니다.</p>
        <div className="flex flex-wrap gap-3">
          <Link href={{ pathname: "/login", query: { next: `/wordbooks/${id}/quiz-word` } }} className="text-sm font-semibold text-blue-700 hover:underline">
            로그인
          </Link>
          {localDebugEnabled ? (
            <Link href={{ pathname: "/api/auth/local-debug-login", query: { next: `/wordbooks/${id}/quiz-word` } }} className="text-sm font-semibold text-blue-700 hover:underline">
              로컬 디버그 로그인
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  const allowed = await canAccessWordbookForStudy({ userId: user.id, wordbookId: id });
  if (!allowed) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">접근할 수 없습니다</h1>
        <p className="text-sm text-slate-600">퀴즈를 시작하려면 먼저 이 단어장을 다운로드하세요.</p>
        <Link href={{ pathname: `/wordbooks/${id}` }} className="text-sm font-semibold text-blue-700 hover:underline">
          단어장 상세로 이동
        </Link>
      </section>
    );
  }

  return <WordbookQuizClient wordbookId={id} initialMode="WORD" />;
}

