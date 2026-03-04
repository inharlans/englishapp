"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_PART_SIZE = 30;
const MIN_PART_SIZE = 1;
const MAX_PART_SIZE = 50;

function clampPartSize(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PART_SIZE;
  return Math.min(MAX_PART_SIZE, Math.max(MIN_PART_SIZE, Math.floor(n)));
}

function clampPartIndex(n: number, partCount: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.floor(n), 1), Math.max(partCount, 1));
}

export function useWordbookParting(wordbookId: number, totalItems: number) {
  const sizeKey = `wordbook_part_size_${wordbookId}`;
  const indexKey = `wordbook_part_index_${wordbookId}`;

  const [partSize, setPartSizeState] = useState<number>(DEFAULT_PART_SIZE);
  const [partIndex, setPartIndexState] = useState<number>(1);

  const partCount = useMemo(
    () => Math.max(1, Math.ceil(Math.max(totalItems, 0) / Math.max(partSize, 1))),
    [partSize, totalItems]
  );

  const syncFromLocation = useCallback(() => {
    if (typeof window === "undefined") return;
    const qs = new URLSearchParams(window.location.search);
    const querySize = Number(qs.get("partSize") ?? "");
    const queryIndex = Number(qs.get("partIndex") ?? "");
    let rawSize = Number.NaN;
    let rawIndex = Number.NaN;
    try {
      rawSize = Number(window.localStorage.getItem(sizeKey) ?? "");
      rawIndex = Number(window.localStorage.getItem(indexKey) ?? "");
    } catch {
      rawSize = Number.NaN;
      rawIndex = Number.NaN;
    }
    const sizeSource = Number.isFinite(querySize) && querySize > 0 ? querySize : rawSize;
    const indexSource = Number.isFinite(queryIndex) && queryIndex > 0 ? queryIndex : rawIndex;
    const nextSize = clampPartSize(sizeSource);
    const resolvedIndex = clampPartIndex(indexSource, Math.max(1, Math.ceil(Math.max(totalItems, 0) / nextSize)));
    setPartSizeState(nextSize);
    setPartIndexState(resolvedIndex);
    try {
      window.localStorage.setItem(sizeKey, String(nextSize));
      window.localStorage.setItem(indexKey, String(resolvedIndex));
    } catch {
      // localStorage can be unavailable in private mode or strict browser settings.
    }
  }, [indexKey, sizeKey, totalItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    syncFromLocation();
    const onPopState = () => {
      syncFromLocation();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [syncFromLocation]);

  useEffect(() => {
    if (partIndex > partCount) {
      setPartIndexState(partCount);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(indexKey, String(partCount));
        } catch {
          // localStorage unavailable
        }
        const qs = new URLSearchParams(window.location.search);
        qs.set("partSize", String(partSize));
        qs.set("partIndex", String(partCount));
        window.history.replaceState(null, "", `${window.location.pathname}?${qs.toString()}`);
      }
    }
  }, [indexKey, partCount, partIndex, partSize]);

  const setPartSize = (value: number) => {
    const next = clampPartSize(value);
    setPartSizeState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(sizeKey, String(next));
      } catch {
        // localStorage unavailable
      }
      const qs = new URLSearchParams(window.location.search);
      qs.set("partSize", String(next));
      qs.set("partIndex", String(clampPartIndex(partIndex, Math.max(1, Math.ceil(Math.max(totalItems, 0) / next)))));
      window.history.replaceState(null, "", `${window.location.pathname}?${qs.toString()}`);
    }
  };

  const setPartIndex = (value: number) => {
    const next = clampPartIndex(value, partCount);
    setPartIndexState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(indexKey, String(next));
      } catch {
        // localStorage unavailable
      }
      const qs = new URLSearchParams(window.location.search);
      qs.set("partSize", String(partSize));
      qs.set("partIndex", String(next));
      window.history.replaceState(null, "", `${window.location.pathname}?${qs.toString()}`);
    }
  };

  return {
    partSize,
    setPartSize,
    partIndex,
    setPartIndex,
    partCount
  };
}
