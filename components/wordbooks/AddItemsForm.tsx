"use client";

import { apiFetch } from "@/lib/clientApi";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  wordbookId: number;
};

function parseBulk(text: string): Array<{
  term: string;
  meaning: string;
  pronunciation?: string | null;
  example?: string | null;
  exampleMeaning?: string | null;
}> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: Array<{
    term: string;
    meaning: string;
    pronunciation?: string | null;
    example?: string | null;
    exampleMeaning?: string | null;
  }> = [];
  for (const line of lines) {
    const tab = line.split("\t").map((s) => s.trim());
    if (tab.length >= 2 && tab[0] && tab[1]) {
      items.push({
        term: tab[0],
        meaning: tab[1],
        pronunciation: tab[2] ? tab[2] : null,
        example: tab[3] ? tab[3] : null,
        exampleMeaning: tab[4] ? tab[4] : null
      });
      continue;
    }

    const m = line.match(/^(.+?)\s*-\s*(.+)$/);
    if (m && m[1] && m[2]) {
      items.push({ term: m[1].trim(), meaning: m[2].trim() });
    }
  }
  return items;
}

export function AddItemsForm({ wordbookId }: Props) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [pron, setPron] = useState("");
  const [example, setExample] = useState("");
  const [exampleMeaning, setExampleMeaning] = useState("");
  const [bulk, setBulk] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (
    items: Array<{
      term: string;
      meaning: string;
      pronunciation?: string | null;
      example?: string | null;
      exampleMeaning?: string | null;
    }>
  ) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "추가에 실패했습니다.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const onAddOne = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = term.trim();
    const m = meaning.trim();
    if (!t || !m) {
      setError("단어와 뜻은 필수입니다.");
      return;
    }
    await submit([
      {
        term: t,
        meaning: m,
        pronunciation: pron.trim() ? pron.trim() : null,
        example: example.trim() ? example.trim() : null,
        exampleMeaning: exampleMeaning.trim() ? exampleMeaning.trim() : null
      }
    ]);
    setTerm("");
    setMeaning("");
    setPron("");
    setExample("");
    setExampleMeaning("");
  };

  const onAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = parseBulk(bulk);
    if (items.length === 0) {
      setError("유효한 줄이 없습니다. 형식: term<TAB>meaning 또는 term - meaning");
      return;
    }
    await submit(items);
    setBulk("");
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">단어 추가</p>
        <form onSubmit={onAddOne} className="mt-3 grid gap-3 md:grid-cols-5">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Word"
            placeholder="단어"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={loading}
          />
          <input
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            aria-label="Meaning"
            placeholder="뜻"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={loading}
          />
          <input
            value={pron}
            onChange={(e) => setPron(e.target.value)}
            aria-label="Pronunciation"
            placeholder="발음 (선택)"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={loading}
          />
          <input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            aria-label="Example"
            placeholder="예문 (선택)"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={loading}
          />
          <input
            value={exampleMeaning}
            onChange={(e) => setExampleMeaning(e.target.value)}
            aria-label="예문 뜻"
            placeholder="예문 뜻 (선택)"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={loading}
          />
          <div className="md:col-span-5">
            <button
              type="submit"
              disabled={loading}
              className="ui-btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          일괄 추가
        </p>
        <p className="mt-2 text-xs text-slate-600">
          한 줄에 하나씩: <code className="rounded bg-slate-100 px-1.5 py-0.5">term[TAB]meaning</code>{" "}
          또는 <code className="rounded bg-slate-100 px-1.5 py-0.5">term - meaning</code>. 세 번째 탭에 발음을 선택적으로 넣을 수 있습니다.
        </p>
        <form onSubmit={onAddBulk} className="mt-3 space-y-3">
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            aria-label="일괄 추가 줄 입력"
            rows={6}
            placeholder={"apple\t사과\nbanana\t바나나\ncarry - 운반하다"}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="ui-btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "추가 중..." : "여러 줄 추가"}
          </button>
        </form>
      </div>

      {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}




