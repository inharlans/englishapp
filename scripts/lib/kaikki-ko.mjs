import fs from "node:fs";
import path from "node:path";

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function posToKoAbbrev(pos) {
  const p = String(pos || "").toLowerCase();
  if (p === "noun") return "명";
  if (p === "verb") return "동";
  if (p === "adj" || p === "adjective") return "형";
  if (p === "adv" || p === "adverb") return "부";
  if (p === "prep" || p === "preposition") return "전";
  if (p === "conj" || p === "conjunction") return "접";
  if (p === "pron" || p === "pronoun") return "대";
  if (p === "interj" || p === "interjection") return "감";
  return null;
}

function buildKaikkiUrl(word) {
  const w = word.trim();
  if (!w) return null;
  const c1 = w[0];
  const c2 = w.length >= 2 ? w.slice(0, 2) : w[0];
  const encoded = encodeURIComponent(w).replace(/%2F/g, "/");
  return `https://kaikki.org/dictionary/All%20languages%20combined/meaning/${encodeURIComponent(
    c1,
  )}/${encodeURIComponent(c2)}/${encoded}.jsonl`;
}

function normalizeLookupWord(en) {
  let w = en.trim();
  // Some lists use "abdominal / abs" - prefer first token.
  w = w.replace(/\s*\/\s*/g, " / ");
  if (w.includes(" / ")) w = w.split(" / ")[0].trim();
  w = w.replace(/[.?!,:;]+$/g, "");
  return w;
}

async function fetchJsonlCached({ word, cacheDir, userAgent }) {
  const w = normalizeLookupWord(word);
  const safe = w.toLowerCase().replace(/[^a-z0-9\-']/g, "_");
  const cachePath = path.join(cacheDir, `${safe}.jsonl`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf8");

  const url = buildKaikkiUrl(w);
  if (!url) return null;

  const res = await fetch(url, { headers: { "user-agent": userAgent } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Kaikki fetch failed (${res.status}) for ${w}`);

  const text = await res.text();
  ensureDir(cacheDir);
  fs.writeFileSync(cachePath, text, "utf8");
  return text;
}

function extractKoFromJsonl(jsonlText) {
  if (!jsonlText) return "";
  const lines = jsonlText.split(/\r?\n/).filter(Boolean);
  const byPos = new Map(); // pos -> Set(words)

  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (!obj || obj.lang_code !== "en") continue;
    const koPos = posToKoAbbrev(obj.pos) || "?";
    const translations = Array.isArray(obj.translations) ? obj.translations : [];
    for (const t of translations) {
      if (!t || t.lang_code !== "ko") continue;
      const kw = String(t.word || "").trim();
      if (!kw) continue;
      const set = byPos.get(koPos) || new Set();
      set.add(kw);
      byPos.set(koPos, set);
    }
  }

  const order = ["명", "동", "형", "부", "전", "접", "대", "감", "?"];
  const parts = [];
  for (const p of order) {
    const set = byPos.get(p);
    if (!set || set.size === 0) continue;
    const vals = Array.from(set);
    vals.sort((a, b) => a.length - b.length || a.localeCompare(b, "ko"));
    parts.push(`(${p})${vals.join(", ")}`);
  }

  return parts.join("");
}

async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function fetchKoForWords({
  words,
  cacheDir,
  userAgent,
  concurrency = 4,
}) {
  ensureDir(cacheDir);
  return await mapPool(words, concurrency, async (w) => {
    const jsonl = await fetchJsonlCached({ word: w, cacheDir, userAgent });
    const ko = extractKoFromJsonl(jsonl);
    return { en: w, ko };
  });
}

