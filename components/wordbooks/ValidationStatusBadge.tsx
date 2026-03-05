import type { CSSProperties } from "react";

type ValidationStatusTone = "valid" | "warning" | "invalid";

const STATUS_STYLES: Record<ValidationStatusTone, CSSProperties> = {
  valid: {
    borderColor: "color-mix(in srgb, var(--ds-color-success) 34%, var(--ds-color-border))",
    backgroundColor: "color-mix(in srgb, var(--ds-color-success) 11%, white)",
    color: "color-mix(in srgb, var(--ds-color-success) 95%, black 5%)"
  },
  warning: {
    borderColor: "color-mix(in srgb, var(--ds-color-warning) 40%, var(--ds-color-border))",
    backgroundColor: "color-mix(in srgb, var(--ds-color-warning) 12%, white)",
    color: "color-mix(in srgb, var(--ds-color-warning) 90%, black 10%)"
  },
  invalid: {
    borderColor: "color-mix(in srgb, var(--ds-color-danger) 40%, var(--ds-color-border))",
    backgroundColor: "color-mix(in srgb, var(--ds-color-danger) 12%, white)",
    color: "color-mix(in srgb, var(--ds-color-danger) 95%, black 5%)"
  }
};

type ValidationStatusBadgeProps = {
  tone: ValidationStatusTone;
  label: string;
};

export function ValidationStatusBadge({ tone, label }: ValidationStatusBadgeProps) {
  return (
    <span
      className="inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={STATUS_STYLES[tone]}
    >
      {label}
    </span>
  );
}
