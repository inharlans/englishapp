import { PartOfSpeech } from "@prisma/client";

import { CLIPPER_AI_EXAMPLE_MAX_LEN, clampLength, isUnsafeAiExample, normalizeWhitespace } from "@/lib/clipper";

type GeminiInputItem = {
  id: number;
  term: string;
  hasSourceExample: boolean;
  exampleSentenceEn?: string | null;
};

type GeminiOutputItem = {
  id: number;
  meaningKo?: string | null;
  partOfSpeech?: string | null;
  exampleSentenceEn?: string | null;
  exampleSentenceKo?: string | null;
  exampleSource?: "SOURCE" | "AI";
};

export type EnrichmentResult = {
  id: number;
  meaningKo: string | null;
  partOfSpeech: PartOfSpeech;
  exampleSentenceEn: string | null;
  exampleSentenceKo: string | null;
  exampleSource: "SOURCE" | "AI" | "NONE";
};

function extractJsonObject(text: string): string | null {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last < 0 || last <= first) return null;
  return text.slice(first, last + 1);
}

function parsePartOfSpeech(value: string | null | undefined): PartOfSpeech {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "noun") return PartOfSpeech.NOUN;
  if (normalized === "verb") return PartOfSpeech.VERB;
  if (normalized === "adjective") return PartOfSpeech.ADJECTIVE;
  if (normalized === "adverb") return PartOfSpeech.ADVERB;
  if (normalized === "phrase") return PartOfSpeech.PHRASE;
  if (normalized === "other") return PartOfSpeech.OTHER;
  return PartOfSpeech.UNKNOWN;
}

function normalizeOutputItem(item: GeminiOutputItem): EnrichmentResult {
  const meaningKo = item.meaningKo ? normalizeWhitespace(item.meaningKo) : null;
  let exampleSentenceEn = item.exampleSentenceEn ? normalizeWhitespace(item.exampleSentenceEn) : null;
  let exampleSentenceKo = item.exampleSentenceKo ? normalizeWhitespace(item.exampleSentenceKo) : null;
  let exampleSource: EnrichmentResult["exampleSource"] =
    item.exampleSource === "SOURCE" || item.exampleSource === "AI" ? item.exampleSource : "NONE";

  if (exampleSentenceEn) {
    exampleSentenceEn = clampLength(exampleSentenceEn, CLIPPER_AI_EXAMPLE_MAX_LEN);
  }
  if (exampleSentenceKo) {
    exampleSentenceKo = clampLength(exampleSentenceKo, CLIPPER_AI_EXAMPLE_MAX_LEN);
  }
  if (exampleSource === "AI" && (!exampleSentenceEn || isUnsafeAiExample(exampleSentenceEn))) {
    exampleSentenceEn = null;
    exampleSentenceKo = null;
    exampleSource = "NONE";
  }

  return {
    id: item.id,
    meaningKo,
    partOfSpeech: parsePartOfSpeech(item.partOfSpeech),
    exampleSentenceEn,
    exampleSentenceKo,
    exampleSource
  };
}

export async function enrichWithGeminiBatch(input: { items: GeminiInputItem[] }): Promise<Map<number, EnrichmentResult>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const provider = (process.env.CLIPPER_LLM_PROVIDER ?? "gemini").toLowerCase();
  if (provider !== "gemini") {
    throw new Error(`Unsupported CLIPPER_LLM_PROVIDER: ${provider}`);
  }
  const model = process.env.CLIPPER_LLM_MODEL ?? "gemini-2.5-flash-lite";

  const payload = {
    items: input.items.map((item) => ({
      id: item.id,
      term: item.term,
      hasSourceExample: item.hasSourceExample,
      exampleSentenceEn: item.exampleSentenceEn ?? null
    }))
  };

  const instruction =
    "Return strict JSON only. Format: {\"items\":[{\"id\":1,\"meaningKo\":\"...\",\"partOfSpeech\":\"noun|verb|adjective|adverb|phrase|other|unknown\",\"exampleSentenceEn\":\"...|null\",\"exampleSentenceKo\":\"...|null\",\"exampleSource\":\"SOURCE|AI\"}]}. " +
    "When hasSourceExample=true, keep source example intent and do not invent a new sentence. " +
    "When hasSourceExample=false, you may generate one short plain sentence (12-18 words), no exaggerated context, no links or emails.";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${instruction}\n\nInput JSON:\n${JSON.stringify(payload)}` }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini request failed with status ${res.status}`);
  }

  const body = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonText = extractJsonObject(raw) ?? raw;
  const parsed = JSON.parse(jsonText) as { items?: GeminiOutputItem[] };
  const out = new Map<number, EnrichmentResult>();
  for (const item of parsed.items ?? []) {
    if (!Number.isFinite(item.id)) continue;
    out.set(item.id, normalizeOutputItem(item));
  }
  return out;
}

type TranslateResponse = {
  data?: { translations?: Array<{ translatedText?: string }> };
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function translateWithGoogle(input: {
  text: string;
  source: string;
  target: string;
}): Promise<string | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      q: input.text,
      source: input.source,
      target: input.target,
      format: "text"
    })
  });
  if (!res.ok) return null;
  const data = (await res.json()) as TranslateResponse;
  const translated = data.data?.translations?.[0]?.translatedText?.trim();
  return translated ? decodeHtmlEntities(translated) : null;
}

