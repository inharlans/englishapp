"use client";

import { apiFetch } from "@/lib/clientApi";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ImportTab = "paste" | "upload" | "manual";

type DraftRow = {
  id: string;
  term: string;
  meaning: string;
};

type RowValidation = {
  position: number;
  term: string;
  meaning: string;
  isValid: boolean;
  isDuplicate: boolean;
  issues: string[];
};

const tsvExample = `index\ten\tko
1\tmister\t(명)-님, -씨, 미스터
2\tvacation\t(명)휴가
3\tclient\t(명)고객, 손님, 클라이언트`;

const csvExample = `index,en,ko
1,mister,"(명)-님, -씨, 미스터"
2,vacation,"(명)휴가"
3,client,"(명)고객, 손님, 클라이언트"`;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseCsvRecords(raw: string): string[][] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        currentCell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      currentRow.push(currentCell);
      currentCell = "";
      if (currentRow.some((c) => c.trim().length > 0)) {
        rows.push(currentRow.map((c) => c.trim()));
      }
      currentRow = [];
      continue;
    }

    currentCell += ch;
  }

  currentRow.push(currentCell);
  if (currentRow.some((c) => c.trim().length > 0)) {
    rows.push(currentRow.map((c) => c.trim()));
  }

  return rows;
}

function parseTsvRecords(raw: string): string[][] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.split("\t").map((c) => c.trim()))
    .filter((cols) => cols.some((c) => c.length > 0));
}

function detectDelimiter(raw: string): "tsv" | "csv" {
  const firstLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
  return firstLines.some((line) => line.includes("\t")) ? "tsv" : "csv";
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function parseImportedRows(rawText: string): DraftRow[] {
  const delimiter = detectDelimiter(rawText);
  const records = delimiter === "tsv" ? parseTsvRecords(rawText) : parseCsvRecords(rawText);
  if (records.length === 0) return [];

  const headers = records[0].map(normalizeHeader);
  const hasHeader = headers.includes("en") || headers.includes("ko") || headers.includes("index");

  let start = 0;
  let indexCol = -1;
  let termCol = -1;
  let meaningCol = -1;

  if (hasHeader) {
    start = 1;
    indexCol = headers.findIndex((h) => h === "index" || h === "position");
    termCol = headers.findIndex((h) => h === "en" || h === "term");
    meaningCol = headers.findIndex((h) => h === "ko" || h === "meaning");
  }

  const rows: DraftRow[] = [];
  for (let i = start; i < records.length; i += 1) {
    const cols = records[i];
    if (!cols || cols.length === 0) continue;

    let term = "";
    let meaning = "";
    if (hasHeader) {
      if (termCol >= 0) term = cols[termCol] ?? "";
      if (meaningCol >= 0) meaning = cols[meaningCol] ?? "";
      if (termCol < 0 || meaningCol < 0) {
        if (cols.length >= 3) {
          term = cols[indexCol >= 0 ? 1 : 0] ?? "";
          meaning = cols[indexCol >= 0 ? 2 : 1] ?? "";
        } else if (cols.length >= 2) {
          term = cols[0] ?? "";
          meaning = cols[1] ?? "";
        }
      }
    } else if (cols.length >= 3) {
      term = cols[1] ?? "";
      meaning = cols[2] ?? "";
    } else if (cols.length >= 2) {
      term = cols[0] ?? "";
      meaning = cols[1] ?? "";
    }

    rows.push({
      id: createId(),
      term: term.trim(),
      meaning: meaning.trim()
    });
  }
  return rows;
}

export default function NewWordbookPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fromLang, setFromLang] = useState("en");
  const [toLang, setToLang] = useState("ko");
  const [tab, setTab] = useState<ImportTab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const validations = useMemo<RowValidation[]>(() => {
    const termCounts = new Map<string, number>();
    for (const row of rows) {
      const key = row.term.trim().toLowerCase();
      if (!key) continue;
      termCounts.set(key, (termCounts.get(key) ?? 0) + 1);
    }

    return rows.map((row, index) => {
      const term = row.term.trim();
      const meaning = row.meaning.trim();
      const issues: string[] = [];
      if (!term) issues.push("term 필수");
      if (!meaning) issues.push("meaning 필수");
      const duplicate = term ? (termCounts.get(term.toLowerCase()) ?? 0) > 1 : false;
      return {
        position: index + 1,
        term,
        meaning,
        isValid: issues.length === 0,
        isDuplicate: duplicate,
        issues
      };
    });
  }, [rows]);

  const validCount = validations.filter((v) => v.isValid).length;
  const invalidCount = validations.length - validCount;
  const duplicateCount = validations.filter((v) => v.isDuplicate).length;
  const displayRows = showInvalidOnly ? validations.filter((v) => !v.isValid) : validations;

  const parsePaste = () => {
    setStatus("");
    setError("");
    const parsed = parseImportedRows(pasteText);
    setRows(parsed);
    setShowInvalidOnly(false);
    setStatus(`불러오기 완료: ${parsed.length}개`);
  };

  const resetPaste = () => {
    setPasteText("");
    setRows([]);
    setShowInvalidOnly(false);
    setStatus("붙여넣기 데이터를 초기화했습니다.");
    setError("");
  };

  const copyText = async (text: string, doneMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(doneMessage);
      setError("");
    } catch {
      setError("클립보드 복사에 실패했습니다.");
    }
  };

  const onUploadFile = async (file: File | null) => {
    if (!file) return;
    setStatus("");
    setError("");
    try {
      const text = await file.text();
      const parsed = parseImportedRows(text);
      setRows(parsed);
      setShowInvalidOnly(false);
      setStatus(`파일에서 ${parsed.length}개 행을 불러왔습니다.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일 파싱에 실패했습니다.");
    }
  };

  const updateRow = (id: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const addRows = (count: number) => {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: count }, () => ({
        id: createId(),
        term: "",
        meaning: ""
      }))
    ]);
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob(["index,en,ko\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wordbook-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("CSV 템플릿을 다운로드했습니다.");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || validCount <= 0) return;

    const finalItems = validations
      .filter((row) => row.isValid)
      .map((row, i) => ({
        position: i + 1,
        term: row.term.trim(),
        meaning: row.meaning.trim()
      }));

    setLoading(true);
    setError("");
    setStatus("");
    try {
      const createRes = await apiFetch("/api/wordbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          fromLang: fromLang.trim() || "en",
          toLang: toLang.trim() || "ko"
        })
      });
      const createJson = (await createRes.json()) as { wordbook?: { id: number }; error?: string };
      if (!createRes.ok || !createJson.wordbook?.id) {
        throw new Error(createJson.error ?? "단어장 생성에 실패했습니다.");
      }

      const wordbookId = createJson.wordbook.id;
      const saveRes = await apiFetch(`/api/wordbooks/${wordbookId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: finalItems })
      });

      if (!saveRes.ok) {
        const saveJson = (await saveRes.json().catch(() => ({}))) as { error?: string };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(`pending_wordbook_items_${wordbookId}`, JSON.stringify(finalItems));
          window.localStorage.setItem(
            `wordbook_flash_${wordbookId}`,
            "단어장은 생성됐지만 단어 저장에 실패했습니다. 다시 시도해 주세요."
          );
        }
        setStatus(saveJson.error ?? "단어장은 생성됐지만 단어 저장에 실패했습니다.");
        router.replace(`/wordbooks/${wordbookId}` as unknown as Parameters<typeof router.replace>[0]);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`pending_wordbook_items_${wordbookId}`);
        window.localStorage.setItem(`wordbook_flash_${wordbookId}`, "단어장 생성 완료");
      }
      router.replace(`/wordbooks/${wordbookId}` as unknown as Parameters<typeof router.replace>[0]);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = title.trim().length > 0 && validCount > 0 && !loading;

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <section className="ui-card p-5">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">포맷 가이드</h2>
        <div className="mt-2 space-y-1 text-sm text-slate-700">
          <p>입력 포맷: index, en, ko (index는 선택이며 자동 생성됩니다)</p>
          <p>저장 시 en-&gt;term, ko-&gt;meaning, index-&gt;position으로 매핑됩니다.</p>
          <p>엑셀/구글시트에서 복사 후 붙여넣기 가능합니다.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">TSV 예시 (TAB)</p>
            <pre className="mt-2 overflow-x-auto text-xs text-slate-700"><code>{tsvExample}</code></pre>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">CSV 예시 (콤마)</p>
            <pre className="mt-2 overflow-x-auto text-xs text-slate-700"><code>{csvExample}</code></pre>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void copyText(tsvExample, "TSV 예시를 복사했습니다.")} className="ui-btn-secondary px-3 py-1.5 text-xs">
            TSV 예시 복사
          </button>
          <button type="button" onClick={() => void copyText(csvExample, "CSV 예시를 복사했습니다.")} className="ui-btn-secondary px-3 py-1.5 text-xs">
            CSV 예시 복사
          </button>
          <button type="button" onClick={downloadCsvTemplate} className="ui-btn-primary px-3 py-1.5 text-xs">
            CSV 템플릿 다운로드
          </button>
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="ui-card p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">단어장 정보</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">제목</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" required disabled={loading} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">원본 언어</span>
              <input value={fromLang} onChange={(e) => setFromLang(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" disabled={loading} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">번역 언어</span>
              <input value={toLang} onChange={(e) => setToLang(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" disabled={loading} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">설명</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" disabled={loading} />
            </label>
          </div>
        </section>

        <section className="ui-card p-5">
          <div role="tablist" aria-label="단어장 입력 방식" className="inline-flex rounded-xl border border-slate-200 p-1 text-xs">
            <button id="new-wordbook-tab-paste" type="button" onClick={() => setTab("paste")} role="tab" aria-selected={tab === "paste"} aria-controls="new-wordbook-panel-paste" tabIndex={tab === "paste" ? 0 : -1} className={tab === "paste" ? "rounded-lg ui-tab-active px-3 py-1.5 font-semibold" : "rounded-lg ui-tab-inactive px-3 py-1.5"}>
              붙여넣기
            </button>
            <button id="new-wordbook-tab-upload" type="button" onClick={() => setTab("upload")} role="tab" aria-selected={tab === "upload"} aria-controls="new-wordbook-panel-upload" tabIndex={tab === "upload" ? 0 : -1} className={tab === "upload" ? "rounded-lg ui-tab-active px-3 py-1.5 font-semibold" : "rounded-lg ui-tab-inactive px-3 py-1.5"}>
              파일 업로드
            </button>
            <button id="new-wordbook-tab-manual" type="button" onClick={() => setTab("manual")} role="tab" aria-selected={tab === "manual"} aria-controls="new-wordbook-panel-manual" tabIndex={tab === "manual" ? 0 : -1} className={tab === "manual" ? "rounded-lg ui-tab-active px-3 py-1.5 font-semibold" : "rounded-lg ui-tab-inactive px-3 py-1.5"}>
              수동 입력
            </button>
          </div>

          {tab === "paste" ? (
            <div id="new-wordbook-panel-paste" role="tabpanel" aria-labelledby="new-wordbook-tab-paste" className="mt-3 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">여기에 붙여넣기</span>
                <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={8} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="index,en,ko 또는 en,ko" />
              </label>
              <p className="text-xs text-slate-500">엑셀에서 복사하면 보통 탭(TSV)으로 붙여넣어집니다.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={parsePaste} disabled={loading} className="ui-btn-primary px-3 py-1.5 text-xs disabled:opacity-60">파싱해서 미리보기</button>
                <button type="button" onClick={resetPaste} disabled={loading} className="ui-btn-secondary px-3 py-1.5 text-xs disabled:opacity-60">초기화</button>
              </div>
            </div>
          ) : null}

          {tab === "upload" ? (
            <div id="new-wordbook-panel-upload" role="tabpanel" aria-labelledby="new-wordbook-tab-upload" className="mt-3 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">파일 선택</span>
                <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" disabled={loading} onChange={(e) => void onUploadFile(e.target.files?.[0] ?? null)} />
              </label>
              <p className="text-xs text-slate-500">지원 확장자: .csv, .tsv, .txt</p>
            </div>
          ) : null}

          {tab === "manual" ? (
            <div id="new-wordbook-panel-manual" role="tabpanel" aria-labelledby="new-wordbook-tab-manual" className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addRows(1)} className="ui-btn-primary px-3 py-1.5 text-xs">+ row</button>
                <button type="button" onClick={() => addRows(10)} className="ui-btn-secondary px-3 py-1.5 text-xs">+10 rows</button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[520px] text-sm" aria-label="수동 입력 단어 표">
                  <thead className="bg-slate-50 text-left text-xs text-slate-600">
                    <tr><th className="px-3 py-2">position</th><th className="px-3 py-2">term (영어)</th><th className="px-3 py-2">meaning (한국어)</th><th className="px-3 py-2">동작</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2"><input value={row.term} onChange={(e) => updateRow(row.id, { term: e.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1" /></td>
                        <td className="px-3 py-2"><input value={row.meaning} onChange={(e) => updateRow(row.id, { meaning: e.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1" /></td>
                        <td className="px-3 py-2"><button type="button" onClick={() => removeRow(row.id)} aria-label={`수동 입력 ${idx + 1}행 삭제`} className="ui-btn-secondary px-2 py-1 text-xs">삭제</button></td>
                      </tr>
                    ))}
                    {rows.length === 0 ? <tr><td className="px-3 py-4 text-xs text-slate-500" colSpan={4}>행이 없습니다. + row 버튼으로 추가해 주세요.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>

        {rows.length > 0 ? (
          <section className="ui-card p-5">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <span>total {validations.length}</span>
              <span>valid {validCount}</span>
              <span>invalid {invalidCount}</span>
              <span>duplicate warnings {duplicateCount}</span>
              <button type="button" onClick={() => setShowInvalidOnly((v) => !v)} className="ml-auto ui-btn-secondary px-2 py-1 text-xs">
                {showInvalidOnly ? "전체 보기" : "invalid만 보기"}
              </button>
            </div>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[620px] text-sm" aria-label="검증 결과 단어 표">
                <thead className="bg-slate-50 text-left text-xs text-slate-600">
                  <tr><th className="px-3 py-2">position</th><th className="px-3 py-2">term</th><th className="px-3 py-2">meaning</th><th className="px-3 py-2">status</th><th className="px-3 py-2">동작</th></tr>
                </thead>
                <tbody>
                  {displayRows.map((v) => {
                    const row = rows[v.position - 1];
                    return (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">{v.position}</td>
                        <td className="px-3 py-2"><input value={row.term} onChange={(e) => updateRow(row.id, { term: e.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1" /></td>
                        <td className="px-3 py-2"><input value={row.meaning} onChange={(e) => updateRow(row.id, { meaning: e.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-1" /></td>
                        <td className="px-3 py-2">
                          {!v.isValid ? (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">invalid ({v.issues.join(", ")})</span>
                          ) : v.isDuplicate ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">warn (duplicate)</span>
                          ) : (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">valid</span>
                          )}
                        </td>
                        <td className="px-3 py-2"><button type="button" onClick={() => removeRow(row.id)} aria-label={`검증 결과 ${v.position}행 삭제`} className="ui-btn-secondary px-2 py-1 text-xs">삭제</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!canSubmit} aria-busy={loading} className="ui-btn-accent px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "생성 중..." : "단어장 생성"}
          </button>
          <button type="button" onClick={() => router.back()} disabled={loading} className="ui-btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
            취소
          </button>
        </div>

        {status ? (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="status" aria-live="polite">
            {status}
          </p>
        ) : null}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
