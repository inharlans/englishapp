"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { StarRating } from "@/components/wordbooks/StarRating";

type Props = {
  wordbookId: number;
  ratingAvg: number;
  ratingCount: number;
  myRating: number | null;
  disabled?: boolean;
};

export function RateBox({ wordbookId, ratingAvg, ratingCount, myRating, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = async (next: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: next })
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Rating failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rating failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <StarRating
          value={ratingAvg}
          count={ratingCount}
          onChange={disabled ? undefined : onChange}
          disabled={disabled || loading}
        />
        <div className="text-xs text-slate-600">
          My rating:{" "}
          <span className="font-semibold text-slate-800">{myRating ? `${myRating}/5` : "-"}</span>
        </div>
      </div>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

