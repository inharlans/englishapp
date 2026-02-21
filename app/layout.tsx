import type { Metadata } from "next";
import { Manrope, Noto_Sans_KR } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { KeyboardPageNavigator } from "@/components/KeyboardPageNavigator";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { getUserFromRequestCookies } from "@/lib/authServer";
import { getBusinessInfo, isBusinessInfoComplete } from "@/lib/businessInfo";

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "englishapp",
  description: "영어 단어 학습과 다운로드 단어장을 제공하는 학습 플랫폼입니다.",
  metadataBase: new URL(appBaseUrl),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Oingapp" }]
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"]
  },
  manifest: "/site.webmanifest"
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
  const business = getBusinessInfo();
  const businessInfoReady = isBusinessInfoComplete(business);

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
          <footer className="mt-10 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-xs leading-6 text-slate-600">
            <p className="font-semibold text-slate-800">사업자 정보</p>
            {!businessInfoReady ? (
              <p className="mt-1 text-blue-700">
                심사용 필수 사업자 정보가 일부 비어 있습니다. 운영 배포 전 환경변수를 입력해 주세요.
              </p>
            ) : null}
            <p className="mt-2">
              상호명: {business.legalName || "-"} | 대표자: {business.representative || "-"} | 사업자등록번호:{" "}
              {business.businessRegistrationNumber || "-"}
            </p>
            <p>
              통신판매업 신고번호: {business.mailOrderRegistrationNumber || "-"} | 주소: {business.address || "-"}
            </p>
            <p>
              고객센터: {business.supportPhone || "-"} / {business.supportEmail || "-"}
              {business.supportHours ? ` (${business.supportHours})` : ""}
            </p>
          </footer>
        </main>
      </body>
    </html>
  );
}

