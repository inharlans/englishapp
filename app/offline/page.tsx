"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { deleteOfflineWordbook, listOfflineWordbooks, type OfflineWordbook } from "@/lib/offlineWordbooks";

export default function OfflineLibraryPage() {
  const [items, setItems] = useState<OfflineWordbook[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listOfflineWordbooks();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오프라인 라이브러리를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const filteredItems = items.filter((wb) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      wb.title.toLowerCase().includes(q) ||
      (wb.ownerEmail ?? "").toLowerCase().includes(q)
    );
  });

  const onDelete = async (id: number) => {
    const ok = window.confirm("이 오프라인 사본을 삭제하시겠습니까?");
    if (!ok) return;
    await deleteOfflineWordbook(id);
    await reload();
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">오프라인</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            오프라인 라이브러리
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            저장한 단어장은 이 브라우저(IndexedDB)에 보관됩니다.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/wordbooks" }}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            뒤로
          </Link>
          <button
            type="button"
            onClick={() => void reload()}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            새로고침
          </button>
        </div>
      </header>

      <div className="ui-card p-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">검색</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목 또는 제작자 이메일"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          총 {items.length}개 중 {filteredItems.length}개 표시
        </p>
      </div>

      {loading ? <p className="text-sm text-slate-600">불러오는 중...</p> : null}
      {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {error}
        </p>
      ) : null}

      {filteredItems.length === 0 && !loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {items.length === 0 ? (
            <>
              아직 저장된 항목이 없습니다. 다운로드한 단어장에서{" "}
              <span className="font-semibold">오프라인 저장</span>을 눌러주세요.
            </>
          ) : (
            <>검색 결과가 없습니다. 검색어를 변경해 주세요.</>
          )}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {filteredItems.map((wb) => (
          <div key={wb.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-slate-900">{wb.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  저장일 {wb.savedAt.slice(0, 10)}
                  {wb.ownerEmail ? ` · 제작자 ${wb.ownerEmail}` : ""}
                </p>
                <p className="mt-2 text-sm text-slate-600">단어 {wb.items.length}개</p>
              </div>
              <button
                type="button"
                onClick={() => void onDelete(wb.id)}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
              >
                삭제
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={{ pathname: `/offline/wordbooks/${wb.id}` }}
                className="ui-btn-primary px-3 py-1.5 text-sm"
              >
                오프라인 학습
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


