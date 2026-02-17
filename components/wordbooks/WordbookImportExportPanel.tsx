"use client";

import { apiFetch } from "@/lib/clientApi";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WordbookImportExportPanel({ wordbookId }: { wordbookId: number }) {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [format, setFormat] = useState<"tsv" | "csv">("tsv");
  const [fillPron, setFillPron] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onImport = async () => {
    if (!rawText.trim()) {
      setMessage("먼저 TSV/CSV 텍스트를 붙여넣으세요.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, format, fillPronunciation: fillPron, replaceAll })
      });
      const json = (await res.json()) as { importedCount?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "가져오기에 실패했습니다.");
      setMessage(`${json.importedCount ?? 0}개 행을 가져왔습니다.`);
      setRawText("");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "가져오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">가져오기 / 내보내기</p>
      <p className="mt-2 text-xs text-slate-600">
        열 순서: term, meaning, pronunciation(선택), example(선택), exampleMeaning(선택)
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-700">
          형식{" "}
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value === "csv" ? "csv" : "tsv")}
            className="rounded border border-slate-300 bg-white px-2 py-1"
          >
            <option value="tsv">TSV</option>
            <option value="csv">CSV</option>
          </select>
        </label>
        <label className="text-xs text-slate-700">
          <input
            type="checkbox"
            checked={fillPron}
            onChange={(e) => setFillPron(e.target.checked)}
            className="mr-1"
          />
          발음 자동 채우기
        </label>
        <label className="text-xs text-slate-700">
          <input
            type="checkbox"
            checked={replaceAll}
            onChange={(e) => setReplaceAll(e.target.checked)}
            className="mr-1"
          />
          기존 항목 전체 교체
        </label>
      </div>
      <textarea
        rows={6}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={"term\tmeaning\tpronunciation\texample\texampleMeaning"}
        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onImport()}
          disabled={loading}
          className="ui-btn-primary px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {loading ? "가져오는 중..." : "가져오기"}
        </button>
        <a
          href={`/api/wordbooks/${wordbookId}/export?format=tsv`}
          className="ui-btn-secondary px-3 py-1.5 text-sm"
        >
          TSV 내보내기
        </a>
        <a
          href={`/api/wordbooks/${wordbookId}/export?format=csv`}
          className="ui-btn-secondary px-3 py-1.5 text-sm"
        >
          CSV 내보내기
        </a>
      </div>
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </section>
  );
}




