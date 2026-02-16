"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";

type TabKey = "memorize" | "quiz-meaning" | "quiz-word" | "list-correct" | "list-wrong" | "list-half";

const KEY_PREFIX = "wordbook_last_tab_";

function toHref(wordbookId: number, tab: TabKey): Route {
  return `/wordbooks/${wordbookId}/${tab}` as Route;
}

export function ResumeStudyButton({ wordbookId }: { wordbookId: number }) {
  const [tab, setTab] = useState<TabKey | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(`${KEY_PREFIX}${wordbookId}`);
    if (
      raw === "memorize" ||
      raw === "quiz-meaning" ||
      raw === "quiz-word" ||
      raw === "list-correct" ||
      raw === "list-wrong" ||
      raw === "list-half"
    ) {
      setTab(raw);
    }
  }, [wordbookId]);

  if (!tab) return null;

  return (
    <Link
      href={toHref(wordbookId, tab)}
      className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-100"
    >
      마지막 학습 이어서
    </Link>
  );
}
