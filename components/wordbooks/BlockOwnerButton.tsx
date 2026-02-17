"use client";

import { apiFetch } from "@/lib/clientApi";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  wordbookId: number;
};

export function BlockOwnerButton({ wordbookId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onBlock = async () => {
    const ok = window.confirm(
      `진짜 블랙 하시겠습니까?\n블랙 해제는 내 단어장의 블랙리스트 안에서 해제할수있습니다.`
    );
    if (!ok) return;

    setLoading(true);
    setMessage("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "처리에 실패했습니다.");
      setMessage("제작자를 블랙리스트에 추가했습니다.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBlock}
        disabled={loading}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? "차단 중..." : "블랙"}
      </button>
      {message ? <p className="mt-1 text-[11px] text-slate-600">{message}</p> : null}
    </div>
  );
}



