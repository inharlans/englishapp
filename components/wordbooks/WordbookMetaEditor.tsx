"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  wordbookId: number;
  title: string;
  description: string | null;
  fromLang: string;
  toLang: string;
};

export function WordbookMetaEditor({ wordbookId, title, description, fromLang, toLang }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [t, setT] = useState(title);
  const [d, setD] = useState(description ?? "");
  const [f, setF] = useState(fromLang);
  const [to, setTo] = useState(toLang);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description: d ? d : null,
          fromLang: f,
          toLang: to
        })
      });
      const json = (await res.json()) as {
        wordbook?: { id: number; title: string; description: string | null; fromLang: string; toLang: string };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      router.refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSave} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
            Title
          </span>
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            required
            disabled={loading}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              From
            </span>
            <input
              value={f}
              onChange={(e) => setF(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              disabled={loading}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              To
            </span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              disabled={loading}
            />
          </label>
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          Description
        </span>
        <textarea
          value={d}
          onChange={(e) => setD(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          rows={3}
          disabled={loading}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </form>
  );
}
