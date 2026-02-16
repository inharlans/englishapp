"use client";

import { apiFetch } from "@/lib/clientApi";

import { useState } from "react";

import { StarRating } from "@/components/wordbooks/StarRating";

type Review = {
  id: number;
  rating: number;
  review: string | null;
  updatedAt: string;
  userEmail: string;
};

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] ?? "*"}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

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
      if (!res.ok) throw new Error(json.error ?? "Failed to load reviews.");
      setReviews(json.reviews ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void toggle()}
        className="rounded-lg border border-transparent px-1 py-0.5 text-left hover:border-slate-200"
        aria-expanded={open}
      >
        <StarRating value={ratingAvg} count={ratingCount} />
      </button>

      {open ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Reviews</p>
          {loading ? <p className="mt-2 text-xs text-slate-500">Loading...</p> : null}
          {error ? <p className="mt-2 text-xs text-blue-700">{error}</p> : null}
          {!loading && !error && reviews.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">?꾩쭅 ?깅줉??由щ럭媛 ?놁뒿?덈떎.</p>
          ) : null}
          {!loading && !error ? (
            <div className="mt-2 space-y-2">
              {reviews.map((r) => (
                <article key={r.id} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} />
                    <span className="text-[11px] text-slate-500">{maskEmail(r.userEmail)}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(r.updatedAt).toISOString().slice(0, 10)}
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


