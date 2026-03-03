import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";

const translateBodySchema = z.object({
  text: z.string().min(1).max(10000),
  source: z.string().trim().min(2).max(12).optional(),
  target: z.string().trim().min(2).max(12).optional()
});

type GoogleTranslateResponse = {
  data?: {
    translations?: Array<{
      translatedText?: string;
    }>;
  };
  error?: {
    message?: string;
  };
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function POST(req: NextRequest) {
  const badReq = await assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const ip = getClientIpFromHeaders(req.headers);
  const limit = await checkRateLimit({
    key: `translate:${ip}`,
    limit: 30,
    windowMs: 60_000
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const parsed = await parseJsonWithSchema(req, translateBodySchema);
    if (!parsed.ok) return parsed.response;
    const text = parsed.data.text.trim();
    const source = (parsed.data.source ?? "en").trim() || "en";
    const target = (parsed.data.target ?? "ko").trim() || "ko";

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_TRANSLATE_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: "text"
      }),
      cache: "no-store"
    });

    const data = (await res.json()) as GoogleTranslateResponse;
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? "Failed to translate text." },
        { status: res.status }
      );
    }

    const translated = data.data?.translations?.[0]?.translatedText?.trim();
    if (!translated) {
      return NextResponse.json({ error: "No translated text returned." }, { status: 502 });
    }

    return NextResponse.json({
      translatedText: decodeHtmlEntities(translated),
      source,
      target
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected translation error."
      },
      { status: 400 }
    );
  }
}
