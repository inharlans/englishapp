"use client";

import { apiFetch } from "@/lib/clientApi";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { StarRating } from "@/components/wordbooks/StarRating";

type Props = {
  wordbookId: number;
  ratingAvg: number;
  ratingCount: number;
  myRating: number | null;
  myReview?: string | null;
  disabled?: boolean;
};

export function RateBox({ wordbookId, ratingAvg, ratingCount, myRating, myReview, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState<number>(myRating ?? 0);
  const [review, setReview] = useState<string>(myReview ?? "");

  const onSubmit = async () => {
    if (disabled || rating < 1 || rating > 5) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, review: review.trim() ? review.trim() : null })
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <StarRating
          value={rating > 0 ? rating : ratingAvg}
          count={ratingCount}
          onChange={disabled ? undefined : (next) => setRating(next)}
          disabled={disabled || loading}
        />
        <div className="text-xs text-slate-600">
          My rating:{" "}
          <span className="font-semibold text-slate-800">{myRating ? `${myRating}/5` : "-"}</span>
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Review</span>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          disabled={disabled || loading}
          rows={3}
          maxLength={1000}
          placeholder="리뷰를 입력해주세요 (선택)"
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={disabled || loading || rating < 1 || rating > 5}
          className="ui-btn-primary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save rating/review"}
        </button>
      </div>

      {error ? <p className="mt-1 text-xs text-blue-700">{error}</p> : null}
    </div>
  );
}


