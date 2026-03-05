import { cookies } from "next/headers";

import { AdSlot } from "@/components/ads/AdSlot";
import { HomeCoreBenefits, HomeHero, HomeLearningFlow, HomeTrustPanel } from "@/components/home";
import type { HeroCopyVariant } from "@/components/home";
import { getAdsConfig } from "@/lib/ads/slots";
import { getUserFromRequestCookies } from "@/lib/authServer";

function resolveRound1HeroVariant(isLoggedIn: boolean): HeroCopyVariant {
  return isLoggedIn ? "b" : "a";
}

export default async function HomePage() {
  const user = await getUserFromRequestCookies(await cookies());
  const adsConfig = getAdsConfig();
  const isLoggedIn = Boolean(user);
  const heroCopyVariant = resolveRound1HeroVariant(isLoggedIn);

  return (
    <section className="space-y-6 md:space-y-8">
      <HomeHero isLoggedIn={isLoggedIn} copyVariant={heroCopyVariant} />
      <HomeLearningFlow />
      <HomeCoreBenefits />
      <HomeTrustPanel isLoggedIn={isLoggedIn} copyVariant={heroCopyVariant} />

      <AdSlot
        slot="HOME_BANNER"
        enabled={adsConfig.enabled}
        client={adsConfig.client}
        unitId={adsConfig.unitIds.HOME_BANNER}
        containerClassName="pt-1"
      />
    </section>
  );
}
