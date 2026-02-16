"use client";

import { apiFetch } from "@/lib/clientApi";

import { useState } from "react";

type UserRow = {
  id: number;
  email: string;
  isAdmin: boolean;
  plan: "FREE" | "PRO";
  proUntil: string | null;
};

export function UserPlanEditor({ user, onUpdated }: { user: UserRow; onUpdated: () => void }) {
  const [plan, setPlan] = useState<UserRow["plan"]>(user.plan);
  const [isAdmin, setIsAdmin] = useState<boolean>(user.isAdmin);
  const [proUntil, setProUntil] = useState<string>(user.proUntil ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSave = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          isAdmin,
          proUntil: proUntil.trim() ? proUntil.trim() : null
        })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value as UserRow["plan"])}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
        disabled={loading}
      >
        <option value="FREE">FREE</option>
        <option value="PRO">PRO</option>
      </select>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          disabled={loading}
        />
        admin
      </label>

      <input
        value={proUntil}
        onChange={(e) => setProUntil(e.target.value)}
        placeholder="proUntil ISO (optional)"
        className="min-w-[260px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
        disabled={loading}
      />

      <button
        type="button"
        onClick={onSave}
        disabled={loading}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save"}
      </button>

      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </div>
  );
}



