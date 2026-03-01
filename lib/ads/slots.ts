export type AdSlotKey = "HOME_BANNER" | "SESSION_END";

export type AdsConfig = {
  enabled: boolean;
  client: string;
  unitIds: Record<AdSlotKey, string>;
};

export const AD_SLOT_LABEL: Record<AdSlotKey, string> = {
  HOME_BANNER: "홈 배너",
  SESSION_END: "세션 종료 배너"
};

export function getAdsConfig(): AdsConfig {
  const enabledRaw = process.env.NEXT_PUBLIC_ADS_ENABLED ?? "";
  return {
    enabled: enabledRaw === "true",
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "",
    unitIds: {
      HOME_BANNER: process.env.NEXT_PUBLIC_ADSENSE_UNIT_HOME_BANNER ?? "",
      SESSION_END: process.env.NEXT_PUBLIC_ADSENSE_UNIT_SESSION_END ?? ""
    }
  };
}

export function isAdsEnabled(): boolean {
  return getAdsConfig().enabled;
}

export function getAdsenseClient(): string {
  return getAdsConfig().client;
}

export function getAdsenseUnitId(slot: AdSlotKey): string {
  return getAdsConfig().unitIds[slot] ?? "";
}
