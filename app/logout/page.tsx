"use client";

import { logoutSession } from "@/lib/api/auth";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState("로그아웃 중...");
  const [error, setError] = useState("");
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setError("");
        setStatus("로그아웃 중...");
        await logoutSession();
        if (cancelled) return;
        setStatus("로그아웃되었습니다. 로그인 화면으로 이동합니다.");
        router.replace("/login");
        router.refresh();
      } catch {
        if (cancelled) return;
        setError("로그아웃 처리에 실패했습니다. 다시 시도해 주세요.");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [retryTick, router]);

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
      <p className="text-sm text-slate-700" role="status" aria-live="polite">{status}</p>
      {error ? (
        <div className="mt-2 space-y-2">
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="alert">
            {error}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRetryTick((v) => v + 1)}
              className="ui-btn-secondary px-3 py-1.5 text-xs"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="ui-btn-secondary px-3 py-1.5 text-xs"
            >
              로그인 화면으로 이동
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}



