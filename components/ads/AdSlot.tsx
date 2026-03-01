"use client";

import { useEffect, useRef } from "react";

import { type AdSlotKey } from "@/lib/ads/slots";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type Props = {
  slot: AdSlotKey;
  enabled: boolean;
  client: string;
  unitId: string;
  isSessionEnd?: boolean;
  containerClassName?: string;
};

export function AdSlot({ slot, enabled, client, unitId, isSessionEnd = false, containerClassName }: Props) {
  const blockedBySessionGuard = slot === "SESSION_END" && !isSessionEnd;
  const pushedRef = useRef(false);

  useEffect(() => {
    if (blockedBySessionGuard || !enabled || !client || !unitId || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // Fail-soft: keep page stable even if ad runtime fails.
    }
  }, [blockedBySessionGuard, enabled, client, unitId]);

  if (blockedBySessionGuard || !enabled || !client || !unitId) return null;

  return (
    <div className={containerClassName} aria-label={slot === "HOME_BANNER" ? "홈 광고 영역" : "세션 종료 광고 영역"}>
      <ins
        className="adsbygoogle block w-full overflow-hidden rounded-xl"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={unitId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
