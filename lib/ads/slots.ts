export type AdSlotKey = "HOME_BANNER" | "SESSION_END";

export const AD_SLOT_LABEL: Record<AdSlotKey, string> = {
  HOME_BANNER: "홈 배너",
  SESSION_END: "세션 종료 배너"
};

export function isAdsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
}

export function getAdsenseClient(): string {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
}

export function getAdsenseUnitId(slot: AdSlotKey): string {
  switch (slot) {
    case "HOME_BANNER":
      return process.env.NEXT_PUBLIC_ADSENSE_UNIT_HOME_BANNER ?? "";
    case "SESSION_END":
      return process.env.NEXT_PUBLIC_ADSENSE_UNIT_SESSION_END ?? "";
    default:
      return "";
  }
}
