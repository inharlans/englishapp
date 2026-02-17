"use client";

import { apiFetch } from "@/lib/clientApi";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  wordbookId: number;
};

export function DeleteWordbookButton({ wordbookId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onDelete = async () => {
    const ok = window.confirm("이 단어장을 삭제할까요? 되돌릴 수 없습니다.");
    if (!ok) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "삭제에 실패했습니다.");
      const href = "/wordbooks";
      router.replace(href as unknown as Parameters<typeof router.replace>[0]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "삭제 중..." : "삭제"}
      </button>
      {error ? <p className="mt-1 text-xs text-blue-700">{error}</p> : null}
    </div>
  );
}




