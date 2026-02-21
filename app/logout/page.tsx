"use client";

import { apiFetch } from "@/lib/clientApi";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState("로그아웃 중...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
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
  }, [router]);

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
      <p className="text-sm text-slate-700" role="status" aria-live="polite">{status}</p>
      {error ? (
        <p className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}



