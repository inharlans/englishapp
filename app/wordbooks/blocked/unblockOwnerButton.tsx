"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { unblockOwner } from "@/lib/api/blockedOwners";

export function UnblockOwnerButton({ ownerId, ownerEmail }: { ownerId: number; ownerEmail: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const onClick = async () => {
    const ok = window.confirm(`${ownerEmail} 차단을 해제할까요?`);
    if (!ok) return;

    setLoading(true);
    setError("");
    setStatus("");
    try {
      await unblockOwner(ownerId);
      setStatus("차단을 해제했습니다.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "차단 해제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={loading}
        aria-busy={loading}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? "해제 중..." : "차단 해제"}
      </button>
      {status ? <p className="text-xs text-slate-600" role="status" aria-live="polite">{status}</p> : null}
      {error ? <p className="text-xs text-blue-700" role="alert">{error}</p> : null}
    </div>
  );
}



