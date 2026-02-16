"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_PART_SIZE = 30;
const MIN_PART_SIZE = 1;
const MAX_PART_SIZE = 200;

function clampPartSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PART_SIZE;
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawSize = Number(window.localStorage.getItem(sizeKey) ?? "");
    const rawIndex = Number(window.localStorage.getItem(indexKey) ?? "");
    const nextSize = clampPartSize(rawSize);
    const nextIndex = clampPartIndex(rawIndex, Math.max(1, Math.ceil(Math.max(totalItems, 0) / nextSize)));
    setPartSizeState(nextSize);
    setPartIndexState(nextIndex);
  }, [indexKey, sizeKey, totalItems]);

  useEffect(() => {
    if (partIndex > partCount) {
      setPartIndexState(partCount);
    }
  }, [partCount, partIndex]);

  const setPartSize = (value: number) => {
    const next = clampPartSize(value);
    setPartSizeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(sizeKey, String(next));
    }
  };

  const setPartIndex = (value: number) => {
    const next = clampPartIndex(value, partCount);
    setPartIndexState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(indexKey, String(next));
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
