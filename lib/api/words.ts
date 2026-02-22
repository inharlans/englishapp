import { apiFetch } from "@/lib/clientApi";

import { parseApiResponse } from "@/lib/api/base";

export async function importWordsRaw(rawText: string): Promise<{
  importedCount: number;
  skippedCount: number;
  delimiter: string;
}> {
  const res = await apiFetch("/api/words/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText })
  });
  const json = await parseApiResponse<{
    importedCount?: number;
    skippedCount?: number;
    delimiter?: string;
  }>(res, "Failed to import words.", "words.import");
  return {
    importedCount: json.importedCount ?? 0,
    skippedCount: json.skippedCount ?? 0,
    delimiter: json.delimiter ?? "unknown"
  };
}
