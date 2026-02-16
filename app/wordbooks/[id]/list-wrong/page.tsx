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
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Wordbook List</h1>
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
        <Link href={{ pathname: "/wordbooks" }} className="text-sm font-semibold text-teal-700 hover:underline">
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
        <p className="text-sm text-slate-600">Download this wordbook first.</p>
      </section>
    );
  }

  return <WordbookListClient wordbookId={id} mode="listWrong" title="오답 목록" />;
}
