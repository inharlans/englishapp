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
        title="Login"
        subtitle="Sign in to use the app and APIs."
      />
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-700">Loading...</p>}>
      <LoginInner />
    </Suspense>
  );
}

