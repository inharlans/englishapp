import type { Metadata } from "next";
import { Manrope, Noto_Sans_KR } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { KeyboardPageNavigator } from "@/components/KeyboardPageNavigator";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AdProviderScript } from "@/components/ads/AdProviderScript";
import { getAdsConfig } from "@/lib/ads/slots";
import { getUserFromRequestCookies } from "@/lib/authServer";
import { getBusinessInfo, isBusinessInfoComplete } from "@/lib/businessInfo";

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const adsConfigForMetadata = getAdsConfig();

export const metadata: Metadata = {
  title: "오잉앱",
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
  manifest: "/site.webmanifest",
  other: adsConfigForMetadata.enabled && adsConfigForMetadata.client
    ? {
        "google-adsense-account": adsConfigForMetadata.client
      }
    : undefined
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
  const adsConfig = getAdsConfig();
  const placeholder = "준비 중";

  return (
    <html lang="ko">
      <body className={`${manrope.variable} ${notoSansKr.variable}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow"
        >
          본문으로 건너뛰기
        </a>
        <div className="flex min-h-screen flex-col">
          <KeyboardPageNavigator />
          <ServiceWorkerRegister />
          <AdProviderScript enabled={adsConfig.enabled} client={adsConfig.client} />
          <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-6 sm:px-6">
            <PwaInstallPrompt />
            <AppNav isLoggedIn={Boolean(user)} />
            {children}
          </main>
          <AppFooter business={business} businessInfoReady={businessInfoReady} placeholder={placeholder} />
        </div>
      </body>
    </html>
  );
}
