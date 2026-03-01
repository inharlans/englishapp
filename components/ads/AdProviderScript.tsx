"use client";

import Script from "next/script";

type Props = {
  enabled: boolean;
  client: string;
};

export function AdProviderScript({ enabled, client }: Props) {

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
