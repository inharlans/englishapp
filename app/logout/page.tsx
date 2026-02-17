"use client";

import { apiFetch } from "@/lib/clientApi";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    };
    void run();
  }, [router]);

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
      <p className="text-sm text-slate-700">로그아웃 중...</p>
    </section>
  );
}



