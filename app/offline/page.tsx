"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { deleteOfflineWordbook, listOfflineWordbooks, type OfflineWordbook } from "@/lib/offlineWordbooks";

export default function OfflineLibraryPage() {
  const [items, setItems] = useState<OfflineWordbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listOfflineWordbooks();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load offline library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const onDelete = async (id: number) => {
    const ok = window.confirm("Remove this offline copy?");
    if (!ok) return;
    await deleteOfflineWordbook(id);
    await reload();
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Offline</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Offline Library
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Saved wordbooks are stored in this browser (IndexedDB).
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/wordbooks" }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </header>

      {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {items.length === 0 && !loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Nothing saved yet. Open a downloaded wordbook and click{" "}
          <span className="font-semibold">Save Offline</span>.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((wb) => (
          <div key={wb.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-slate-900">{wb.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  saved {wb.savedAt.slice(0, 10)}
                  {wb.ownerEmail ? ` · by ${wb.ownerEmail}` : ""}
                </p>
                <p className="mt-2 text-sm text-slate-600">{wb.items.length} items</p>
              </div>
              <button
                type="button"
                onClick={() => void onDelete(wb.id)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={{ pathname: `/offline/wordbooks/${wb.id}` }}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Study Offline
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
