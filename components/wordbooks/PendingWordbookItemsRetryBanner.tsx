"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/clientApi";

type PendingItem = {
  position: number;
  term: string;
  meaning: string;
};

function readPendingItems(wordbookId: number): PendingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`pending_wordbook_items_${wordbookId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row, idx) => {
        const term = typeof row === "object" && row && "term" in row ? String((row as { term: unknown }).term).trim() : "";
        const meaning =
          typeof row === "object" && row && "meaning" in row ? String((row as { meaning: unknown }).meaning).trim() : "";
        return { position: idx + 1, term, meaning };
      })
      .filter((row) => row.term && row.meaning);
  } catch {
    return [];
  }
}

export function PendingWordbookItemsRetryBanner({ wordbookId }: { wordbookId: number }) {
  const [flashMessage, setFlashMessage] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flashKey = `wordbook_flash_${wordbookId}`;
    const flash = window.localStorage.getItem(flashKey) ?? "";
    if (flash) {
      setFlashMessage(flash);
      window.localStorage.removeItem(flashKey);
    }
    const pending = readPendingItems(wordbookId);
    setPendingCount(pending.length);
  }, [wordbookId]);

  const onRetry = async () => {
    const pending = readPendingItems(wordbookId);
    if (pending.length === 0) {
      setPendingCount(0);
      return;
    }

    setRetrying(true);
    setError("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pending })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "단어 저장 재시도에 실패했습니다.");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`pending_wordbook_items_${wordbookId}`);
      }
      setPendingCount(0);
      setFlashMessage("단어 저장 재시도에 성공했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "단어 저장 재시도에 실패했습니다.");
    } finally {
      setRetrying(false);
    }
  };

  if (!flashMessage && pendingCount <= 0 && !error) return null;

  return (
    <div className="space-y-2">
      {flashMessage ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {flashMessage}
        </div>
      ) : null}
      {pendingCount > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            단어장은 생성되었지만 단어 저장에 실패했습니다. 다시 시도해주세요.
          </p>
          <p className="mt-1 text-xs">대기 중인 단어 {pendingCount}개</p>
          <button
            type="button"
            onClick={() => void onRetry()}
            disabled={retrying}
            className="ui-btn-primary mt-3 px-3 py-1.5 text-xs disabled:opacity-60"
          >
            {retrying ? "재업로드 중..." : "단어 다시 업로드"}
          </button>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

