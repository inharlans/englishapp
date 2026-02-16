"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/clientApi";

type Props = {
  wordbookId: number;
};

const reasonOptions = [
  "Spam / abuse",
  "Copyright concern",
  "Offensive content",
  "Wrong/low quality translation",
  "Other"
];

export function ReportWordbookButton({ wordbookId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasonOptions[0]);
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), detail: detail.trim() || null })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed.");
      setMessage("Reported.");
      setOpen(false);
      setDetail("");
    } catch (e2) {
      setMessage(e2 instanceof Error ? e2.message : "Failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="report-toggle"
        aria-expanded={open}
        aria-controls={`report-form-${wordbookId}`}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
      >
        {open ? "Cancel Report" : "Report"}
      </button>

      {open ? (
        <form
          id={`report-form-${wordbookId}`}
          onSubmit={onSubmit}
          className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3"
        >
          <label className="block text-xs text-slate-700">
            <span className="font-semibold">Reason</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="report-reason"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              {reasonOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-700">
            <span className="font-semibold">Detail (optional)</span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              data-testid="report-detail"
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
          </label>
          <button
            type="submit"
            data-testid="report-submit"
            disabled={loading}
            className="ui-btn-primary px-3 py-1.5 text-xs disabled:opacity-60"
          >
            {loading ? "Reporting..." : "Submit Report"}
          </button>
        </form>
      ) : null}

      {message ? (
        <p className="text-[11px] text-slate-600" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}



