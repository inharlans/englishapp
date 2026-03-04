import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

function isCrawlerLockdownEnabled(): boolean {
  const raw = (process.env.CRAWLER_LOCKDOWN_MODE ?? "on").trim().toLowerCase();
  return raw !== "off" && raw !== "0" && raw !== "false";
}

export default function robots(): MetadataRoute.Robots {
  if (!isCrawlerLockdownEnabled()) {
    return {
      rules: {
        userAgent: "*",
        allow: "/"
      }
    };
  }

  return {
    rules: {
      userAgent: "*",
      disallow: "/"
    }
  };
}
