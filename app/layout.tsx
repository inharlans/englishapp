import type { Metadata } from "next";

import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { KeyboardPageNavigator } from "@/components/KeyboardPageNavigator";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "English 1500 Memorizer",
  description: "Weekly memorize cards + quizzes with spaced repetition."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow"
        >
          본문으로 건너뛰기
        </a>
        <KeyboardPageNavigator />
        <ServiceWorkerRegister />
        <main id="main-content" className="mx-auto min-h-screen w-full max-w-5xl p-6">
          <PwaInstallPrompt />
          <AppNav />
          {children}
        </main>
      </body>
    </html>
  );
}
