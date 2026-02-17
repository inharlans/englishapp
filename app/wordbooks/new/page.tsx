"use client";

import { apiFetch } from "@/lib/clientApi";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewWordbookPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fromLang, setFromLang] = useState("en");
  const [toLang, setToLang] = useState("ko");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/wordbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description ? description : null,
          fromLang,
          toLang
        })
      });
      const json = (await res.json()) as { wordbook?: { id: number }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "생성에 실패했습니다.");
      const href = `/wordbooks/${json.wordbook!.id}`;
      router.replace(href as unknown as Parameters<typeof router.replace>[0]);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          단어장
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">새 단어장 만들기</h1>
        <p className="mt-2 text-sm text-slate-600">나만의 단어장을 만들어 보세요.</p>
        <p className="mt-1 text-xs text-slate-500">
          무료 요금제: 단어장 1개까지 생성. PRO: 무제한 생성.
        </p>
      </header>

      <section className="ui-card p-5">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
          단어장 가이드
        </h2>
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">1) 제목은 좁고 명확하게:</span>{" "}
            예: &#34;토익 파트5 빈출 동사 120&#34;, &#34;여행 영어 식당 표현&#34;.
          </p>
          <p>
            <span className="font-semibold text-slate-900">2) 설명에 범위/목표를 쓰기:</span>{" "}
            학습 대상, 예상 소요시간, 추천 사용법을 2~3줄로 적으면 재사용성이 좋아집니다.
          </p>
          <p>
            <span className="font-semibold text-slate-900">3) 한 단어장에는 하나의 기준만:</span>{" "}
            난이도/주제/시험영역 중 하나를 기준으로 묶으면 기억 효율이 올라갑니다.
          </p>
          <p>
            <span className="font-semibold text-slate-900">4) 단어 추가 형식 추천:</span>{" "}
            term(필수), meaning(필수), pronunciation(선택), example(선택), exampleMeaning(선택).
          </p>
          <p>
            <span className="font-semibold text-slate-900">5) 예문은 짧고 실제형으로:</span>{" "}
            8~16단어, 현재 시제 중심, 뜻은 직역보다 자연스러운 한국어 권장.
          </p>
        </div>
      </section>

      <div className="ui-card p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
              disabled={loading}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                원본 언어
              </span>
              <input
                value={fromLang}
                onChange={(e) => setFromLang(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={loading}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                번역 언어
              </span>
              <input
                value={toLang}
                onChange={(e) => setToLang(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={loading}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              설명
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={loading}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="ui-btn-accent px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "생성 중..." : "생성"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="ui-btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
          </div>

          {error ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}




