"use client";

import { setWordbookPublic } from "@/lib/api/wordbook";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  wordbookId: number;
  isPublic: boolean;
};

export function PublishToggle({ wordbookId, isPublic }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onToggle = async () => {
    setLoading(true);
    setError("");
    try {
      await setWordbookPublic({ wordbookId, isPublic: !isPublic });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "저장 중..." : isPublic ? "비공개로 전환" : "공개로 전환"}
      </button>
      {error ? <p className="mt-1 text-xs text-blue-700">{error}</p> : null}
    </div>
  );
}




