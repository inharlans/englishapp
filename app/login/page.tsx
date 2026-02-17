"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { LoginPanel } from "@/components/auth/LoginPanel";

function LoginInner() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  return (
    <section className="mx-auto max-w-md">
      <LoginPanel
        nextPath={nextPath}
        title="로그인"
        subtitle="앱과 API를 사용하려면 로그인하세요."
      />
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-700">불러오는 중...</p>}>
      <LoginInner />
    </Suspense>
  );
}

