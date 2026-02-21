"use client";

import { apiFetch } from "@/lib/clientApi";

import Link from "next/link";
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
      "이 제작자를 차단하시겠습니까?\n차단한 제작자의 단어장은 마켓에서 숨겨지며, 차단 목록에서 해제할 수 있습니다."
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
      setMessage("제작자를 차단했습니다. 차단 목록에서 언제든 해제할 수 있습니다.");
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
        {loading ? "차단 중..." : "차단"}
      </button>
      {message ? (
        <p className="mt-1 text-[11px] text-slate-600" role="status" aria-live="polite">
          {message}{" "}
          <Link href={{ pathname: "/wordbooks/blocked" }} className="font-semibold text-blue-700 hover:underline">
            차단 목록 관리
          </Link>
        </p>
      ) : null}
    </div>
  );
}



