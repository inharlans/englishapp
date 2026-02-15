"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  wordbookId: number;
  isPublic: boolean;
};

export function PublishToggle({ wordbookId, isPublic }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onToggle = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic })
      });
      const json = (await res.json()) as { wordbook?: { id: number; isPublic: boolean }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : isPublic ? "Unpublish" : "Publish"}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
