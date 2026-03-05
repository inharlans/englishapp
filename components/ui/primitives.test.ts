import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/Button";
import { Feedback } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

(globalThis as { React?: typeof React }).React = React;

describe("ui primitives", () => {
  it("merges external and internal aria-describedby in Input", () => {
    const html = renderToStaticMarkup(
      createElement(Input, {
        id: "email",
        label: "이메일",
        hint: "힌트",
        value: "",
        onChange: () => undefined,
        "aria-describedby": "external-help"
      })
    );

    expect(html).toContain('aria-describedby="external-help email-hint"');
  });

  it("renders live danger Feedback as alert with assertive announcement", () => {
    const FeedbackComponent = Feedback as unknown as (props: { tone?: "danger"; live?: boolean }) => ReturnType<typeof Feedback>;
    const html = renderToStaticMarkup(createElement(FeedbackComponent, { tone: "danger", live: true }, "오류"));

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });

  it("renders SurfaceCard with non-section wrapper", () => {
    const html = renderToStaticMarkup(createElement(SurfaceCard, null, "콘텐츠"));

    expect(html.startsWith('<div class="ui-surface')).toBe(true);
  });

  it("applies Button variant and size classes", () => {
    const ButtonComponent = Button as unknown as (props: { variant?: "secondary"; size?: "lg" }) => ReturnType<typeof Button>;
    const html = renderToStaticMarkup(createElement(ButtonComponent, { variant: "secondary", size: "lg" }, "버튼"));

    expect(html).toContain("ui-btn--secondary");
    expect(html).toContain("ui-btn--lg");
  });
});
