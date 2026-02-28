"use client";

import { useEffect, useState } from "react";

export type DensityMode = "compact" | "standard" | "focus";
const KEY = "ui_density_mode";

export function useDensityMode(defaultMode: DensityMode = "standard") {
  const [mode, setMode] = useState<DensityMode>(defaultMode);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(KEY);
    if (stored === "compact" || stored === "standard" || stored === "focus") {
      setMode(stored);
    }
  }, []);

  const updateMode = (next: DensityMode) => {
    setMode(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, next);
    }
  };

  return { mode, setMode: updateMode };
}

export function densityCardClass(mode: DensityMode) {
  if (mode === "compact") return "p-2 text-sm";
  if (mode === "focus") return "p-5 text-base";
  return "p-3 text-sm";
}
