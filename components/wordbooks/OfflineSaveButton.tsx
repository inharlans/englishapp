"use client";

import { fetchWordbookDetail } from "@/lib/api/wordbook";

import { useState } from "react";

import { saveOfflineWordbook } from "@/lib/offlineWordbooks";

type Props = {
  wordbookId: number;
  className?: string;
};

export function OfflineSaveButton({ wordbookId, className }: Props) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const onSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const wb = await fetchWordbookDetail(wordbookId);
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
      setMsg("오프라인으로 저장했습니다.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "저장에 실패했습니다.");
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
        {saving ? "저장 중..." : "오프라인 저장"}
      </button>
      {msg ? <p className="mt-1 text-xs text-slate-600">{msg}</p> : null}
    </div>
  );
}


