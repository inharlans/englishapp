"use client";

import { apiFetch } from "@/lib/clientApi";

import { useState } from "react";

const SAMPLE = `index\ten\tko
1\tready\t준비가 된
2\toften\t자주, 종종`;

export function ImportPanel() {
  const [rawText, setRawText] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await apiFetch("/api/words/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Import failed.");
      }
      setMessage(
        `완료: ${data.importedCount}개 추가, ${data.skippedCount}개 건너뜀 (구분자: ${data.delimiter})`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h1 className="mb-2 text-2xl font-semibold">단어 데이터 Import</h1>
      <p className="mb-4 text-sm text-slate-600">
        TSV를 우선 파싱하고 실패하면 CSV로 다시 시도합니다. 헤더에 `en`, `ko` 컬럼이 필요합니다.
      </p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <textarea
          className="h-64 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Import 중..." : "Import 실행"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}



