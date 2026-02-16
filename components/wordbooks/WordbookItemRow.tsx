"use client";

import { apiFetch } from "@/lib/clientApi";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MeaningView } from "@/components/MeaningView";
import { SpeakButton } from "@/components/wordbooks/SpeakButton";
import { useMeaningViewMode } from "@/components/wordbooks/useMeaningViewMode";

type Item = {
  id: number;
  term: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  exampleMeaning: string | null;
  position: number;
};

type Props = {
  wordbookId: number;
  item: Item;
  editable: boolean;
  speakLang?: string;
};

export function WordbookItemRow({ wordbookId, item, editable, speakLang }: Props) {
  const router = useRouter();
  const [term, setTerm] = useState(item.term);
  const [meaning, setMeaning] = useState(item.meaning);
  const [pron, setPron] = useState(item.pronunciation ?? "");
  const [example, setExample] = useState(item.example ?? "");
  const [exampleMeaning, setExampleMeaning] = useState(item.exampleMeaning ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { mode } = useMeaningViewMode();

  const onSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term,
          meaning,
          pronunciation: pron ? pron : null,
          example: example ? example : null,
          exampleMeaning: exampleMeaning ? exampleMeaning : null
        })
      });
      const json = (await res.json()) as { item?: Item; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const ok = window.confirm("Delete this item?");
    if (!ok) return;
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/items/${item.id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      {editable ? (
        <div className="grid gap-2 md:grid-cols-12 md:items-center">
          <div className="md:col-span-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              disabled={saving}
            />
          </div>
          <div className="md:col-span-3">
            <input
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              disabled={saving}
            />
          </div>
          <div className="md:col-span-2">
            <input
              value={pron}
              onChange={(e) => setPron(e.target.value)}
              placeholder="pron."
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              disabled={saving}
            />
          </div>
          <div className="md:col-span-3">
            <input
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="example (optional)"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              disabled={saving}
            />
          </div>
          <div className="md:col-span-2">
            <input
              value={exampleMeaning}
              onChange={(e) => setExampleMeaning(e.target.value)}
              placeholder="example ko"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              disabled={saving}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:col-span-12 md:justify-end">
            <SpeakButton text={term} lang={speakLang} />
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Del
            </button>
          </div>
          {error ? <p className="md:col-span-12 text-xs text-rose-700">{error}</p> : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {item.term}{" "}
              {item.pronunciation ? (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  [{item.pronunciation}]
                </span>
              ) : null}
            </p>
            <MeaningView value={item.meaning} mode={mode} className="mt-1 text-sm text-slate-700" />
            {item.example ? (
              <p className="mt-1 text-xs text-slate-500">
                e.g. {item.example}
                {item.exampleMeaning ? ` - ${item.exampleMeaning}` : ""}
              </p>
            ) : null}
          </div>
          <SpeakButton text={item.term} lang={speakLang} />
        </div>
      )}
    </div>
  );
}
