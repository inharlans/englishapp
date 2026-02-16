"use client";

import { apiFetch } from "@/lib/clientApi";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  wordbookId: number;
  ownerEmail: string;
};

export function BlockOwnerButton({ wordbookId, ownerEmail }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onBlock = async () => {
    const ok = window.confirm(`Block creator ${ownerEmail}? Their public wordbooks will be hidden.`);
    if (!ok) return;

    setLoading(true);
    setMessage("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed.");
      setMessage("Creator blocked.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBlock}
        disabled={loading}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? "Blocking..." : "Block Creator"}
      </button>
      {message ? <p className="mt-1 text-[11px] text-slate-600">{message}</p> : null}
    </div>
  );
}



