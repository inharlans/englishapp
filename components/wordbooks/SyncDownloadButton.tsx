"use client";

import { apiFetch } from "@/lib/clientApi";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  wordbookId: number;
};

export function SyncDownloadButton({ wordbookId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const runSync = async (preserveStudyState: boolean) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/sync-download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preserveStudyState })
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        summary?: { addedCount: number; updatedCount: number; deletedCount: number };
      };
      if (!res.ok) throw new Error(json.error ?? "Sync failed.");
      const s = json.summary ?? { addedCount: 0, updatedCount: 0, deletedCount: 0 };
      setMessage(`동기화 완료: +${s.addedCount} / ~${s.updatedCount} / -${s.deletedCount}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSync(true)}
          className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-60"
        >
          업데이트 적용(학습 유지)
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSync(false)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          업데이트 적용(학습 초기화)
        </button>
      </div>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
