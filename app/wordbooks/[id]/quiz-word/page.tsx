import Link from "next/link";
import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";
import { WordbookQuizClient } from "../quiz/quizClient";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export default async function WordbookQuizWordPage(props: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequestCookies(await cookies());
  if (!user) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Wordbook Quiz</h1>
        <p className="text-sm text-slate-600">Login required.</p>
      </section>
    );
  }

  const { id: idRaw } = await props.params;
  const id = parseId(idRaw);
  if (!id) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Invalid wordbook</h1>
        <Link href={{ pathname: "/wordbooks" }} className="text-sm font-semibold text-blue-700 hover:underline">
          Back
        </Link>
      </section>
    );
  }

  const allowed = await canAccessWordbookForStudy({ userId: user.id, wordbookId: id });
  if (!allowed) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Forbidden</h1>
        <p className="text-sm text-slate-600">Download this wordbook first to start quiz.</p>
      </section>
    );
  }

  return <WordbookQuizClient wordbookId={id} initialMode="WORD" />;
}

