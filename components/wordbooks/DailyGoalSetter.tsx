"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { updateDailyGoal } from "@/lib/api/users";

export function DailyGoalSetter({ initialGoal }: { initialGoal: number }) {
  const router = useRouter();
  const [goal, setGoal] = useState(String(initialGoal));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const goalNum = Number(goal);
  const isValidGoal = Number.isFinite(goalNum) && goalNum >= 1 && goalNum <= 500;

  const onSave = async () => {
    if (!isValidGoal) {
      setError("목표량은 1~500 사이 숫자로 입력해 주세요.");
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateDailyGoal(Math.floor(goalNum));
      setSuccess("당일 목표가 저장되었습니다.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "당일 목표 저장에 실패했습니다.");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="daily-goal-input" className="text-xs font-semibold text-slate-600">당일 목표량</label>
      <input
        id="daily-goal-input"
        type="number"
        min={1}
        max={500}
        step={1}
        inputMode="numeric"
        value={goal}
        onChange={(e) => {
          setGoal(e.target.value);
          setError("");
          setSuccess("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void onSave();
          }
        }}
        aria-describedby="daily-goal-help"
        className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving || !isValidGoal}
        className="ui-btn-primary px-3 py-1 text-xs disabled:opacity-60"
      >
        {saving ? "저장 중..." : "목표 저장"}
      </button>
      <span id="daily-goal-help" className="text-[11px] text-slate-500">1~500 범위</span>
      {success ? (
        <span className="text-xs text-blue-700" role="status" aria-live="polite">
          {success}
        </span>
      ) : null}
      {error ? (
        <span className="text-xs text-blue-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
