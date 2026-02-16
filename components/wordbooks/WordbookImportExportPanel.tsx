"use client";

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
      setMessage("Paste TSV/CSV text first.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/wordbooks/${wordbookId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, format, fillPronunciation: fillPron, replaceAll })
      });
      const json = (await res.json()) as { importedCount?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Import failed.");
      setMessage(`Imported ${json.importedCount ?? 0} rows.`);
      setRawText("");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Import / Export</p>
      <p className="mt-2 text-xs text-slate-600">
        Columns: term, meaning, pronunciation(optional), example(optional), exampleMeaning(optional)
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-700">
          Format{" "}
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
          Auto fill pronunciation
        </label>
        <label className="text-xs text-slate-700">
          <input
            type="checkbox"
            checked={replaceAll}
            onChange={(e) => setReplaceAll(e.target.checked)}
            className="mr-1"
          />
          Replace existing items
        </label>
      </div>
      <textarea
        rows={6}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={"term\tmeaning\tpronunciation\texample\texampleMeaning"}
        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onImport()}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Importing..." : "Import"}
        </button>
        <a
          href={`/api/wordbooks/${wordbookId}/export?format=tsv`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
        >
          Export TSV
        </a>
        <a
          href={`/api/wordbooks/${wordbookId}/export?format=csv`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
        >
          Export CSV
        </a>
      </div>
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </section>
  );
}

