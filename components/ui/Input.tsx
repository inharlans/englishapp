import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "aria-invalid" | "data-invalid"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function Input({ id, label, error, hint, className = "", ...rest }: Props) {
  const internalDescribedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const externalDescribedBy = rest["aria-describedby"];
  const describedBy = [externalDescribedBy, internalDescribedBy].filter(Boolean).join(" ") || undefined;

  return (
    <label htmlFor={id} className="block">
      <span className="text-xs font-semibold text-[var(--token-text-secondary)]">{label}</span>
      <input
        {...rest}
        id={id}
        className={["ui-input mt-1", className].filter(Boolean).join(" ")}
        data-invalid={error ? "true" : "false"}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-xs text-[var(--token-status-danger)]" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-[var(--token-text-secondary)]">{hint}</span>
      ) : null}
    </label>
  );
}
