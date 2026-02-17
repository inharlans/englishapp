import type { Metadata } from "next";
import { Manrope, Noto_Sans_KR } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { KeyboardPageNavigator } from "@/components/KeyboardPageNavigator";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getUserFromRequestCookies } from "@/lib/authServer";

export const metadata: Metadata = {
  title: "Englishapp",
  description: "English 1500 + downloadable wordbooks learning platform."
};

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-manrope"
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-noto-kr"
});

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUserFromRequestCookies(await cookies());

  return (
    <html lang="ko">
      <body className={`${manrope.variable} ${notoSansKr.variable}`}>
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
          <AppNav isLoggedIn={Boolean(user)} />
          {children}
        </main>
      </body>
    </html>
  );
}

