"use client";

import { useState } from "react";

type Props = {
  wordbookId: number;
};

export function ReportWordbookButton({ wordbookId }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onReport = async () => {
    const reason = window.prompt("Report reason (required):", "Spam / abuse");
    if (!reason || !reason.trim()) return;
    const detail = window.prompt("Detail (optional):", "") ?? "";

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), detail: detail.trim() || null })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed.");
      setMessage("Reported.");
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
        onClick={onReport}
        disabled={loading}
        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
      >
        {loading ? "Reporting..." : "Report"}
      </button>
      {message ? <p className="mt-1 text-[11px] text-slate-600">{message}</p> : null}
    </div>
  );
}

