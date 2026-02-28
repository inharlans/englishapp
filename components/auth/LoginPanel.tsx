"use client";

import { useState } from "react";

import { loginWithEmail } from "@/lib/api/auth";

export function LoginPanel({
  nextPath = "/wordbooks",
  title = "로그인",
  subtitle = "앱과 API를 사용하려면 로그인하세요.",
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
  const isProduction = process.env.NODE_ENV === "production";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginWithEmail({ email, password });
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

      {isProduction ? (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          일반 사용자는 아래 간편 로그인(OAuth)을 사용하세요.
        </div>
      ) : null}

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">간편 로그인</p>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-2">
          <a
            href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`}
            aria-label="Google로 계속하기"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M21.35 11.1h-9.18v2.98h5.28c-.23 1.52-1.75 4.46-5.28 4.46-3.18 0-5.76-2.63-5.76-5.88s2.58-5.88 5.76-5.88c1.81 0 3.02.77 3.71 1.44l2.54-2.46C16.79 4.25 14.72 3.3 12.17 3.3 7.07 3.3 2.93 7.48 2.93 12.66s4.14 9.36 9.24 9.36c5.33 0 8.86-3.74 8.86-9.01 0-.61-.07-1.07-.16-1.51z"
              />
              <path fill="#FF3D00" d="M2.93 7.22l3.47 2.54c.94-1.86 2.87-3.14 5.77-3.14 1.81 0 3.02.77 3.71 1.44l2.54-2.46C16.79 4.25 14.72 3.3 12.17 3.3c-3.55 0-6.57 2.03-8.24 4.92z" />
              <path fill="#4CAF50" d="M12.17 22.02c2.48 0 4.56-.82 6.08-2.22l-2.81-2.3c-.75.53-1.74.9-3.27.9-3.47 0-4.95-2.31-5.3-3.47l-3.45 2.66c1.65 3.1 4.88 4.43 8.75 4.43z" />
              <path fill="#1976D2" d="M21.35 11.1h-9.18v2.98h5.28c-.11.71-.52 1.74-1.31 2.49l.01-.01 2.81 2.3c-.2.18 3.07-2.25 3.07-6.2 0-.61-.07-1.07-.16-1.51z" />
            </svg>
            Google로 계속하기
          </a>

          <a
            href={`/api/auth/naver?next=${encodeURIComponent(nextPath)}`}
            aria-label="네이버로 계속하기"
            className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-[#03C75A] bg-[#03C75A] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
          >
            네이버로 계속하기
          </a>

          <a
            href={`/api/auth/kakao?next=${encodeURIComponent(nextPath)}`}
            aria-label="카카오로 계속하기"
            className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-[#FEE500] bg-[#FEE500] px-4 py-2.5 text-sm font-semibold text-[#191919] transition hover:brightness-95"
          >
            카카오로 계속하기
          </a>
        </div>
      </div>

      <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          비밀번호 로그인 (관리자/개발용)
        </summary>
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          <label className="block" htmlFor="login-email">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">이메일</span>
            <input
              id="login-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          <label className="block" htmlFor="login-password">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">비밀번호</span>
            <input
              id="login-password"
              name="password"
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
            aria-busy={loading}
            className="ui-btn-accent w-full px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </details>

      {error ? (
        <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="alert">
          {error}
        </p>
      ) : null}

      {oauthError ? (
        <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="alert">
          {oauthError}
        </p>
      ) : null}
    </section>
  );
}
