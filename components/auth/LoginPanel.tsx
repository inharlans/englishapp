"use client";

import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "@/lib/clientApi";

export function LoginPanel({
  nextPath = "/wordbooks",
  title = "로그인",
  subtitle = "계속하려면 로그인하세요.",
  oauthError
}: {
  nextPath?: string;
  title?: string;
  subtitle?: string;
  oauthError?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "로그인에 실패했습니다.");
      }
      window.location.assign(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.75)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">다시 오신 것을 환영합니다</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">이메일</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            autoComplete="email"
            required
            disabled={loading}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">비밀번호</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            autoComplete="current-password"
            required
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="ui-btn-accent w-full px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {error ? (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{error}</p>
        ) : null}

        {oauthError ? (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{oauthError}</p>
        ) : null}
      </form>

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">간편 로그인</p>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-2">
          <Link
            href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.7C16.9 2.7 14.7 1.8 12 1.8 6.9 1.8 2.8 6 2.8 11.2S6.9 20.6 12 20.6c6.9 0 9.2-4.9 9.2-7.4 0-.5 0-.9-.1-1.3H12z"
              />
            </svg>
            Google로 계속하기
          </Link>

          <Link
            href={`/api/auth/naver?next=${encodeURIComponent(nextPath)}`}
            className="flex w-full items-center justify-center rounded-xl border border-[#03C75A] bg-[#03C75A] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
          >
            네이버로 계속하기
          </Link>

          <Link
            href={`/api/auth/kakao?next=${encodeURIComponent(nextPath)}`}
            className="flex w-full items-center justify-center rounded-xl border border-[#FEE500] bg-[#FEE500] px-4 py-2.5 text-sm font-semibold text-[#191919] transition hover:brightness-95"
          >
            카카오로 계속하기
          </Link>
        </div>
      </div>
    </section>
  );
}