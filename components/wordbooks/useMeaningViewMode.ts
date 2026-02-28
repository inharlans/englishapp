"use client";

import { useEffect, useState } from "react";

export type MeaningViewMode = "compact" | "detailed";

const KEY = "meaning_view_mode";

export function useMeaningViewMode(defaultMode: MeaningViewMode = "compact") {
  const [mode, setMode] = useState<MeaningViewMode>(defaultMode);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(KEY);
    if (stored === "compact" || stored === "detailed") {
      setMode(stored);
    }
  }, []);

  const updateMode = (next: MeaningViewMode) => {
    setMode(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, next);
    }
  };

  return { mode, setMode: updateMode };
}
