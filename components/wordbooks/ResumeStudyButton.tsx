"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";

type TabKey = "memorize" | "cards" | "quiz-meaning" | "quiz-word" | "list-correct" | "list-wrong" | "list-half";

const KEY_PREFIX = "wordbook_last_tab_";
const cardsEnabled = process.env.NEXT_PUBLIC_ENABLE_WORDBOOK_CARDS !== "0";

function toHref(wordbookId: number, tab: TabKey, partSize: number | null, partIndex: number | null): Route {
  const base = `/wordbooks/${wordbookId}/${tab}`;
  const qs = new URLSearchParams();
  if (Number.isFinite(partSize) && (partSize ?? 0) > 0) qs.set("partSize", String(partSize));
  if (Number.isFinite(partIndex) && (partIndex ?? 0) > 0) qs.set("partIndex", String(partIndex));
  const queryString = qs.toString();
  return (queryString ? `${base}?${queryString}` : base) as Route;
}

function tabLabel(tab: TabKey): string {
  switch (tab) {
    case "memorize":
      return "암기";
    case "cards":
      return "카드";
    case "quiz-meaning":
      return "의미 퀴즈";
    case "quiz-word":
      return "단어 퀴즈";
    case "list-correct":
      return "정답 목록";
    case "list-wrong":
      return "오답 목록";
    case "list-half":
      return "회복 목록";
    default:
      return "학습";
  }
}

export function ResumeStudyButton({ wordbookId }: { wordbookId: number }) {
  const [tab, setTab] = useState<TabKey | null>(null);
  const [partSize, setPartSize] = useState<number | null>(null);
  const [partIndex, setPartIndex] = useState<number | null>(null);
  const [lastStudiedAt, setLastStudiedAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(`${KEY_PREFIX}${wordbookId}`);
    const rawPartSize = Number(window.localStorage.getItem(`wordbook_part_size_${wordbookId}`) ?? "");
    const rawPartIndex = Number(window.localStorage.getItem(`wordbook_part_index_${wordbookId}`) ?? "");
    const rawLastStudiedAt = Number(window.localStorage.getItem(`wordbook_last_studied_at_${wordbookId}`) ?? "");
    if (Number.isFinite(rawPartSize) && rawPartSize > 0) setPartSize(Math.floor(rawPartSize));
    if (Number.isFinite(rawPartIndex) && rawPartIndex > 0) setPartIndex(Math.floor(rawPartIndex));
    if (Number.isFinite(rawLastStudiedAt) && rawLastStudiedAt > 0) setLastStudiedAt(Math.floor(rawLastStudiedAt));
    if (
      raw === "memorize" ||
      (raw === "cards" && cardsEnabled) ||
      raw === "quiz-meaning" ||
      raw === "quiz-word" ||
      raw === "list-correct" ||
      raw === "list-wrong" ||
      raw === "list-half"
    ) {
      setTab(raw);
      return;
    }
    if (raw === "cards" && !cardsEnabled) {
      setTab("memorize");
    }
  }, [wordbookId]);

  if (!tab) return null;
  const studiedAtLabel = lastStudiedAt
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(lastStudiedAt))
    : null;

  return (
    <Link
      href={toHref(wordbookId, tab, partSize, partIndex)}
      className="inline-flex flex-col rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100"
    >
      <span>
        마지막 학습 이어서 ({tabLabel(tab)}
        {partIndex ? ` · ${partIndex}파트` : ""})
      </span>
      {studiedAtLabel ? <span className="text-xs font-medium text-blue-700">최근 학습: {studiedAtLabel}</span> : null}
    </Link>
  );
}

