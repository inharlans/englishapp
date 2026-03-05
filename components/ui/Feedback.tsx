import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "danger";

export function Feedback({ tone = "info", children, live = false }: { tone?: Tone; children: ReactNode; live?: boolean }) {
  const role = live ? (tone === "danger" ? "alert" : "status") : undefined;
  const ariaLive = live ? (tone === "danger" ? "assertive" : "polite") : undefined;

  return (
    <div className="ui-feedback" data-tone={tone} role={role} aria-live={ariaLive}>
      {children}
    </div>
  );
}
