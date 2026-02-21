"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { deleteOfflineWordbook, listOfflineWordbooks, type OfflineWordbook } from "@/lib/offlineWordbooks";
import { maskEmailAddress, sanitizeUserText } from "@/lib/textQuality";

export default function OfflineLibraryPage() {
  const [items, setItems] = useState<OfflineWordbook[]>([]);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"saved-desc" | "saved-asc" | "words-desc">("saved-desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const busy = loading || deletingId !== null;

  const formatDateKst = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(iso));

  const reload = async () => {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const list = await listOfflineWordbooks();
      setItems(list);
      setInfo(`오프라인 라이브러리를 새로고침했습니다. 총 ${list.length}개 항목입니다.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오프라인 라이브러리를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true");

      if (event.key === "Escape" && query.trim()) {
        event.preventDefault();
        setQuery("");
        searchInputRef.current?.focus();
        return;
      }

      if (isTyping) return;
      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        if (!busy) void reload();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, query]);

  useEffect(() => {
    if (!info) return;
    const timeout = window.setTimeout(() => setInfo(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [info]);

  const trimmedQuery = query.trim();
  const filteredItems = useMemo(
    () =>
      items
    .filter((wb) => {
      const q = trimmedQuery.toLowerCase();
      if (!q) return true;
      return wb.title.toLowerCase().includes(q) || (wb.ownerEmail ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortMode === "saved-asc") return a.savedAt.localeCompare(b.savedAt, "ko");
      if (sortMode === "words-desc") return b.items.length - a.items.length;
      return b.savedAt.localeCompare(a.savedAt, "ko");
    }),
    [items, sortMode, trimmedQuery]
  );

  const onDelete = async (id: number, title: string) => {
    const ok = window.confirm(`"${title}" 오프라인 사본을 삭제하시겠습니까?`);
    if (!ok) return;
    setDeletingId(id);
    setError("");
    setInfo("");
    try {
      await deleteOfflineWordbook(id);
      await reload();
      setInfo(`"${title}" 오프라인 사본을 삭제했습니다.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오프라인 사본 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters = trimmedQuery.length > 0 || sortMode !== "saved-desc";
  const sortModeLabel = sortMode === "saved-asc" ? "저장일 오래된순" : sortMode === "words-desc" ? "단어 수 많은순" : "저장일 최신순";

  return (
    <section className="space-y-6" aria-labelledby="offline-library-title">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">오프라인</p>
          <h1 id="offline-library-title" className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            오프라인 라이브러리
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            저장한 단어장은 이 브라우저(IndexedDB)에 보관됩니다.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={{ pathname: "/wordbooks" }} className="ui-btn-secondary px-4 py-2 text-sm">
            뒤로
          </Link>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={busy}
            aria-busy={loading}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            {loading ? "불러오는 중" : "새로고침"}
          </button>
        </div>
      </header>

      <div className="ui-card p-4">
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <label className="block md:col-span-7">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">검색</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목 또는 제작자 이메일"
              ref={searchInputRef}
              aria-label="오프라인 단어장 검색"
              aria-describedby="offline-search-help"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={busy}
            />
            <span id="offline-search-help" className="mt-1 block text-[11px] text-slate-500">
              제목 또는 제작자 이메일로 검색할 수 있습니다.
            </span>
          </label>
          <label className="block md:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">정렬</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "saved-desc" | "saved-asc" | "words-desc")}
              aria-label="오프라인 단어장 정렬"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={busy}
            >
              <option value="saved-desc">저장일 최신순</option>
              <option value="saved-asc">저장일 오래된순</option>
              <option value="words-desc">단어 수 많은순</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSortMode("saved-desc");
                searchInputRef.current?.focus();
              }}
              disabled={busy || !hasActiveFilters}
              className="ui-btn-secondary w-full px-4 py-2 text-sm"
            >
              필터 초기화
            </button>
          </div>
        </div>
        {!loading ? (
          <p className="mt-2 text-xs text-slate-500" aria-live="polite" aria-atomic="true">
            총 {items.length}개 중 {filteredItems.length}개 표시 · 정렬: {sortModeLabel}
            {trimmedQuery ? ` · 검색어: "${trimmedQuery}"` : ""}
            {hasActiveFilters ? " · 필터 적용됨" : ""}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-slate-600" role="status" aria-live="polite">
          불러오는 중...
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="alert">
          {error}
        </p>
      ) : null}
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status" aria-live="polite">
        {info || "\u00A0"}
      </p>

      {filteredItems.length === 0 && !loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600" role="status" aria-live="polite">
          {items.length === 0 ? (
            <>
              아직 저장된 항목이 없습니다. 다운로드한 단어장에서 <span className="font-semibold">오프라인 저장</span>을 눌러주세요. <Link href="/wordbooks" className="font-semibold text-blue-700 hover:underline">내 단어장으로 이동</Link>
              {" · "}
              <Link href="/wordbooks/market" className="font-semibold text-blue-700 hover:underline">마켓 둘러보기</Link>
            </>
          ) : (
            <>
              검색 결과가 없습니다. 검색어를 변경해 주세요.{" "}
              <button
                type="button"
                className="font-semibold text-blue-700 hover:underline"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
              >
                검색어 초기화
              </button>
            </>
          )}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2" role="list" aria-label="오프라인 단어장 목록" aria-busy={busy}>
        {filteredItems.map((wb) => (
          <div key={wb.id} className="rounded-2xl border border-slate-200 bg-white p-4" role="listitem">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-slate-900">{sanitizeUserText(wb.title, "제목 없음")}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  저장일 {formatDateKst(wb.savedAt)}
                  {wb.ownerEmail ? ` · 제작자 ${maskEmailAddress(wb.ownerEmail)}` : ""}
                </p>
                <p className="mt-2 text-sm text-slate-600">단어 {wb.items.length}개</p>
              </div>
              <button
                type="button"
                onClick={() => void onDelete(wb.id, wb.title)}
                disabled={busy}
                aria-label={`${wb.title} 오프라인 사본 삭제`}
                aria-busy={deletingId === wb.id}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
              >
                {deletingId === wb.id ? "삭제 중..." : "삭제"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={{ pathname: `/offline/wordbooks/${wb.id}` }}
                className="ui-btn-primary px-3 py-1.5 text-sm"
                aria-label={`${wb.title} 오프라인 학습으로 이동`}
              >
                오프라인 학습
              </Link>
              <Link
                href={{ pathname: `/wordbooks/${wb.id}` }}
                className="ui-btn-secondary px-3 py-1.5 text-sm"
                aria-label={`${wb.title} 온라인 원본으로 이동`}
              >
                온라인 원본
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
