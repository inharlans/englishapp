"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getOfflineWordbook, type OfflineWordbook } from "@/lib/offlineWordbooks";
import { SpeakButton } from "@/components/wordbooks/SpeakButton";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function StudyClient({ id }: { id: number }) {
  const [wb, setWb] = useState<OfflineWordbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [orderSeed, setOrderSeed] = useState(0);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid id.");
        const found = await getOfflineWordbook(Math.floor(id));
        if (!found) throw new Error("Not found in offline library.");
        setWb(found);
        setIdx(0);
        setShowMeaning(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  const items = useMemo(() => {
    if (!wb) return [];
    // orderSeed is used to force reshuffle without mutating stored data.
    void orderSeed;
    return shuffle(wb.items);
  }, [wb, orderSeed]);

  const current = items[idx] ?? null;
  const speakLang = wb?.fromLang?.toLowerCase().startsWith("en") ? "en-US" : undefined;

  const next = () => {
    setShowMeaning(false);
    setIdx((v) => Math.min(v + 1, Math.max(items.length - 1, 0)));
  };
  const prev = () => {
    setShowMeaning(false);
    setIdx((v) => Math.max(v - 1, 0));
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Offline</p>
          <h1 className="mt-2 truncate text-3xl font-black tracking-tight text-slate-900">
            {wb ? wb.title : "Study"}
          </h1>
          {wb ? (
            <p className="mt-2 text-sm text-slate-600">
              {items.length} items | {idx + 1}/{Math.max(items.length, 1)}
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/offline" }}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={() => setOrderSeed((v) => v + 1)}
            className="ui-btn-secondary px-4 py-2 text-sm"
            disabled={!wb || items.length === 0}
          >
            Shuffle
          </button>
        </div>
      </header>

      {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
      {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {error}
        </p>
      ) : null}

      {wb && current ? (
        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Card
            </p>
            <SpeakButton text={current.term} lang={speakLang} />
          </div>

          <div className="mt-5">
            <p className="text-4xl font-black tracking-tight text-slate-900">{current.term}</p>
            {current.pronunciation ? (
              <p className="mt-2 text-sm text-slate-500">[{current.pronunciation}]</p>
            ) : null}
          </div>

          <div className="mt-6">
            {showMeaning ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Meaning
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">{current.meaning}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMeaning(true)}
                className="ui-btn-secondary w-full px-4 py-4 text-left text-sm"
              >
                Tap to reveal meaning
              </button>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={idx <= 0}
              className="ui-btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setShowMeaning((v) => !v)}
              className="ui-btn-secondary px-4 py-2 text-sm"
            >
              {showMeaning ? "Hide" : "Reveal"}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={idx >= items.length - 1}
              className="ui-btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}



