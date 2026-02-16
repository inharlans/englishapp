"use client";

import { apiFetch } from "@/lib/clientApi";

import { useState } from "react";

import { saveOfflineWordbook } from "@/lib/offlineWordbooks";

type Props = {
  wordbookId: number;
  className?: string;
};

type ApiWordbookDetail = {
  id: number;
  title: string;
  description: string | null;
  fromLang: string;
  toLang: string;
  owner?: { email: string };
  items: Array<{ term: string; meaning: string; pronunciation: string | null }>;
};

export function OfflineSaveButton({ wordbookId, className }: Props) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const onSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}`, { method: "GET" });
      const json = (await res.json()) as { wordbook?: ApiWordbookDetail; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch wordbook.");
      const wb = json.wordbook;
      if (!wb) throw new Error("Invalid response.");
      await saveOfflineWordbook({
        id: wb.id,
        title: wb.title,
        description: wb.description ?? null,
        fromLang: wb.fromLang,
        toLang: wb.toLang,
        ownerEmail: wb.owner?.email ?? null,
        savedAt: new Date().toISOString(),
        items: (wb.items ?? []).map((it) => ({
          term: it.term,
          meaning: it.meaning,
          pronunciation: it.pronunciation ?? null
        }))
      });
      setMsg("Saved for offline.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Offline"}
      </button>
      {msg ? <p className="mt-1 text-xs text-slate-600">{msg}</p> : null}
    </div>
  );
}


