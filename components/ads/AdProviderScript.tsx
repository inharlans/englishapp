"use client";

import Script from "next/script";

import { getAdsenseClient, isAdsEnabled } from "@/lib/ads/slots";

export function AdProviderScript() {
  const enabled = isAdsEnabled();
  const client = getAdsenseClient();

  if (!enabled || !client) return null;

  return (
    <Script
      id="adsense-script"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
