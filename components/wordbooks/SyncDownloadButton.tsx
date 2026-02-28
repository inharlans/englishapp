"use client";

import { syncDownloadedWordbook } from "@/lib/api/wordbook";
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
      const s = await syncDownloadedWordbook({ wordbookId, preserveStudyState });
      setMessage(`동기화 완료: +${s.addedCount} / ~${s.updatedCount} / -${s.deletedCount}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "동기화에 실패했습니다.");
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
          className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
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
      {message ? <p className="text-xs text-blue-700">{message}</p> : null}
      {error ? <p className="text-xs text-blue-700">{error}</p> : null}
    </div>
  );
}


