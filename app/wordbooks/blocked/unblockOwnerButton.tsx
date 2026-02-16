"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/clientApi";

export function UnblockOwnerButton({ ownerId, ownerEmail }: { ownerId: number; ownerEmail: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onClick = async () => {
    const ok = window.confirm(`Unblock ${ownerEmail}?`);
    if (!ok) return;

    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/blocked-owners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unblock failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unblock failed.");
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
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? "Unblocking..." : "Unblock"}
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

