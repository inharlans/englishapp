import * as React from "react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

(globalThis as { React?: typeof React }).React = React;

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => new Map())
}));

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) =>
    createElement("a", { href, className }, children)
}));

vi.mock("@/components/ads/AdSlot", () => ({
  AdSlot: ({ slot }: { slot: string }) => createElement("div", { "data-slot": slot }, "ad")
}));

vi.mock("@/components/metrics/MetricLink", () => ({
  MetricLink: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) =>
    createElement("a", { href, className }, children)
}));

vi.mock("@/lib/authServer", () => ({
  getUserFromRequestCookies: vi.fn(async () => ({ id: 1, plan: "PRO" }))
}));

vi.mock("@/lib/ads/slots", () => ({
  getAdsConfig: vi.fn(() => ({
    enabled: true,
    client: "test-client",
    unitIds: {
      HOME_BANNER: "test-home-banner"
    }
  }))
}));

describe("HomePage", () => {
  it("renders offline review link for authenticated users", async () => {
    const { default: HomePage } = await import("./page");

    const view = await HomePage();
    const html = renderToStaticMarkup(view);

    expect(html).toContain("오프라인 복습");
    expect(html).toContain('href="/offline"');
  });
});
