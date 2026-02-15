"use client";

import { useState } from "react";

import { UserPlanEditor } from "@/components/admin/UserPlanEditor";

type UserRow = {
  id: number;
  email: string;
  isAdmin: boolean;
  plan: "FREE" | "PRO";
  proUntil: string | null;
  createdAt: string;
};

export function AdminUsersClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const json = (await res.json()) as {
        users?: Array<{
          id: number;
          email: string;
          isAdmin: boolean;
          plan: "FREE" | "PRO";
          proUntil: string | null;
          createdAt: string;
        }>;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Load failed.");
      setUsers((json.users ?? []) as UserRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Users</h1>
          <p className="mt-2 text-sm text-slate-600">Set plan/admin flags.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">
                  #{u.id} {u.email}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  created {u.createdAt.slice(0, 10)} · plan {u.plan}
                  {u.isAdmin ? " · admin" : ""}
                  {u.proUntil ? ` · proUntil ${u.proUntil}` : ""}
                </p>
              </div>
            </div>
            <UserPlanEditor user={u} onUpdated={() => void reload()} />
          </div>
        ))}
      </div>
    </section>
  );
}
