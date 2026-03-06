import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { Button as ShadcnButton } from "@/components/shadcn/ui/button";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

function mapVariant(variant: ButtonVariant): "default" | "outline" | "ghost" | "destructive" {
  switch (variant) {
    case "secondary":
      return "outline";
    case "ghost":
      return "ghost";
    case "danger":
      return "destructive";
    default:
      return "default";
  }
}

function mapSize(size: ButtonSize): "sm" | "default" | "lg" {
  switch (size) {
    case "sm":
      return "sm";
    case "lg":
      return "lg";
    default:
      return "default";
  }
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    fullWidth = false,
    className = "",
    type = "button",
    ...rest
  },
  ref
) {
  return (
    <ShadcnButton
      ref={ref}
      type={type}
      variant={mapVariant(variant)}
      size={mapSize(size)}
      className={cn(
        "ui-btn",
        variant === "primary" && "ui-btn--primary",
        variant === "secondary" && "ui-btn--secondary",
        variant === "ghost" && "ui-btn--ghost",
        variant === "danger" && "ui-btn--danger",
        size === "sm" && "ui-btn--sm",
        size === "md" && "ui-btn--md",
        size === "lg" && "ui-btn--lg",
        "font-semibold",
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </ShadcnButton>
  );
});
