"use client";

import { apiFetch } from "@/lib/clientApi";

import { useState } from "react";

import { StarRating } from "@/components/wordbooks/StarRating";
import { maskEmailAddress } from "@/lib/textQuality";

type Review = {
  id: number;
  rating: number;
  review: string | null;
  updatedAt: string;
  userEmail: string;
};

export function MarketRatingReviews({
  wordbookId,
  ratingAvg,
  ratingCount
}: {
  wordbookId: number;
  ratingAvg: number;
  ratingCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);

  const toggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || reviews.length > 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/reviews?take=20`, { cache: "no-store" });
      const json = (await res.json()) as { reviews?: Review[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "리뷰를 불러오지 못했습니다.");
      setReviews(json.reviews ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "리뷰를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };
  const formattedAverage = Number.isFinite(ratingAvg) ? ratingAvg.toFixed(1) : "0.0";
  const formatDateKst = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(iso));

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void toggle()}
        className="rounded-lg border border-transparent px-1 py-0.5 text-left hover:border-slate-200"
        aria-expanded={open}
        aria-label={`평점 ${formattedAverage}점, 리뷰 ${ratingCount}개`}
      >
        <StarRating value={ratingAvg} count={ratingCount} />
      </button>

      {open ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">리뷰</p>
          {loading ? <p className="mt-2 text-xs text-slate-500">불러오는 중...</p> : null}
          {error ? <p className="mt-2 text-xs text-blue-700">{error}</p> : null}
          {!loading && !error && reviews.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">아직 등록된 리뷰가 없습니다.</p>
          ) : null}
          {!loading && !error ? (
            <div className="mt-2 space-y-2">
              {reviews.map((r) => (
                <article key={r.id} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} />
                    <span className="text-[11px] text-slate-500">{maskEmailAddress(r.userEmail)}</span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateKst(r.updatedAt)}
                    </span>
                  </div>
                  {r.review ? <p className="mt-1 text-xs text-slate-700">{r.review}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


