"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getClipperSettings, updateClipperDefaultWordbook } from "@/lib/api/clipper-settings";

type WordbookOption = {
  id: number;
  title: string;
};

type Props = {
  wordbooks: WordbookOption[];
};

export function ClipperDefaultWordbookPicker({ wordbooks }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasWordbooks = wordbooks.length > 0;

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const settings = await getClipperSettings();
        if (!mounted) return;
        setSelectedId(settings.defaultWordbookId ? String(settings.defaultWordbookId) : "");
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "클리퍼 설정을 불러오지 못했습니다.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedWordbookExists = useMemo(() => {
    if (!selectedId) return false;
    const selectedNum = Number(selectedId);
    return wordbooks.some((wordbook) => wordbook.id === selectedNum);
  }, [selectedId, wordbooks]);

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const nextId = selectedId ? Number(selectedId) : null;
      const result = await updateClipperDefaultWordbook(nextId);
      setSelectedId(result.defaultWordbookId ? String(result.defaultWordbookId) : "");
      if (result.defaultWordbookId) {
        setSuccess("클리퍼 저장 단어장을 설정했습니다.");
      } else {
        setSuccess("클리퍼 저장 단어장 지정이 해제되었습니다.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "클리퍼 저장 단어장 설정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ui-card p-4" aria-labelledby="clipper-default-wordbook-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Clipper 설정</p>
          <h2 id="clipper-default-wordbook-title" className="mt-1 text-lg font-black text-slate-900">
            클리퍼 저장 단어장 지정
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            확장자에서 `단어장에 추가`를 누를 때 사용할 기본 단어장을 선택하세요.
          </p>
        </div>
        <Link href={{ pathname: "/clipper/extension" }} className="ui-btn-secondary px-3 py-1.5 text-xs">
          확장자 설치 안내
        </Link>
      </div>

      {!hasWordbooks ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">먼저 단어장을 만들어 주세요.</p>
          <p className="mt-1">단어장이 있어야 클리퍼 저장 단어장을 지정할 수 있습니다.</p>
          <Link href={{ pathname: "/wordbooks/new" }} className="mt-3 inline-flex ui-btn-accent px-3 py-1.5 text-xs">
            새 단어장 만들기
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-700" htmlFor="clipper-default-wordbook-select">
            저장 단어장
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="clipper-default-wordbook-select"
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setError("");
                setSuccess("");
              }}
              disabled={loading || saving}
              className="min-w-[240px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">선택 안 함</option>
              {wordbooks.map((wordbook) => (
                <option key={wordbook.id} value={String(wordbook.id)}>
                  {wordbook.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || loading}
              className="ui-btn-primary px-3 py-2 text-sm disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
          {!loading && selectedId !== "" && !selectedWordbookExists ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" role="status" aria-live="polite">
              지정된 단어장이 없습니다. 단어장을 지정해 주세요
            </p>
          ) : null}
        </div>
      )}

      {success ? (
        <p className="mt-3 text-sm text-emerald-700" role="status" aria-live="polite">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
