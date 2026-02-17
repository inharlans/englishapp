"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/clientApi";

export function DailyGoalSetter({ initialGoal }: { initialGoal: number }) {
  const router = useRouter();
  const [goal, setGoal] = useState(String(initialGoal));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onSave = async () => {
    const n = Number(goal);
    if (!Number.isFinite(n)) return;

    setSaving(true);
    setError("");
    try {
      const res = await apiFetch("/api/users/me/daily-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyGoal: Math.max(1, Math.min(500, Math.floor(n))) })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "당일 목표 저장에 실패했습니다.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "당일 목표 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-slate-600">당일 목표량</span>
      <input
        type="number"
        min={1}
        max={500}
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving}
        className="ui-btn-primary px-3 py-1 text-xs disabled:opacity-60"
      >
        {saving ? "저장 중..." : "목표 저장"}
      </button>
      {error ? <span className="text-xs text-blue-700">{error}</span> : null}
    </div>
  );
}

