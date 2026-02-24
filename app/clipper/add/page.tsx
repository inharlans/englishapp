"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { apiFetch } from "@/lib/clientApi";
import { CLIPPER_EXAMPLE_MAX_LEN, CLIPPER_TERM_MAX_LEN, sanitizeExampleInput, sanitizeTermInput } from "@/lib/clipper";

const payloadSchema = z.object({
  term: z.string().min(1).max(CLIPPER_TERM_MAX_LEN),
  exampleSentenceEn: z.string().max(CLIPPER_EXAMPLE_MAX_LEN).optional(),
  sourceUrl: z.string().url().optional(),
  sourceTitle: z.string().max(300).optional(),
  wordbookId: z.number().int().positive().optional()
});

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

export default function ClipperAddBridgePage() {
  const searchParams = useSearchParams();
  const payloadRaw = searchParams.get("payload") ?? "";
  const payload = useMemo(() => {
    if (!payloadRaw) return null;
    try {
      const decoded = decodeBase64Url(payloadRaw);
      const parsed = JSON.parse(decoded) as unknown;
      const checked = payloadSchema.parse(parsed);
      return {
        term: sanitizeTermInput(checked.term),
        exampleSentenceEn: checked.exampleSentenceEn ? sanitizeExampleInput(checked.exampleSentenceEn) : undefined,
        sourceUrl: checked.sourceUrl,
        sourceTitle: checked.sourceTitle,
        wordbookId: checked.wordbookId
      };
    } catch {
      return null;
    }
  }, [payloadRaw]);

  const [status, setStatus] = useState<"idle" | "saving" | "created" | "duplicate" | "failed">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!payload) {
      setStatus("failed");
      setMessage("클리퍼 payload를 해석할 수 없습니다.");
      return;
    }

    let mounted = true;
    setStatus("saving");
    setMessage("단어를 저장하고 있습니다...");
    void (async () => {
      try {
        const res = await apiFetch("/api/clipper/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = (await res.json()) as { status?: string; error?: string };
        if (!mounted) return;
        if (res.ok && json.status === "created") {
          setStatus("created");
          setMessage("단어장에 추가했습니다. 의미/품사/해석은 잠시 후 채워집니다.");
          return;
        }
        if (res.ok && json.status === "duplicate") {
          setStatus("duplicate");
          setMessage("이미 같은 단어가 단어장에 있습니다.");
          return;
        }
        setStatus("failed");
        setMessage(json.error ?? "단어 저장에 실패했습니다.");
      } catch (error) {
        if (!mounted) return;
        setStatus("failed");
        setMessage(error instanceof Error ? error.message : "단어 저장 중 오류가 발생했습니다.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [payload]);

  return (
    <section className="mx-auto max-w-2xl space-y-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Clipper Bridge</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">PDF 단어 저장</h1>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-700" role="status" aria-live="polite">
          {message}
        </p>
        {payload ? (
          <p className="mt-2 text-xs text-slate-500">
            term: <span className="font-semibold text-slate-700">{payload.term}</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/wordbooks" className="ui-btn-secondary px-3 py-2 text-sm">
          내 단어장으로 이동
        </Link>
        <Link href="/wordbooks/new" className="ui-btn-secondary px-3 py-2 text-sm">
          단어장 만들기
        </Link>
      </div>

      {status === "failed" ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          저장에 실패했습니다. 로그인 상태와 기본 단어장 설정을 확인해 주세요.
        </p>
      ) : null}
    </section>
  );
}

