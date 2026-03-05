import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = "" }: Props) {
  return <div className={["ui-surface", className].filter(Boolean).join(" ")}>{children}</div>;
}
