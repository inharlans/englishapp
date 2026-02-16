"use client";

import { useState } from "react";
import { useEffect } from "react";

import { UserPlanEditor } from "@/components/admin/UserPlanEditor";

type UserRow = {
  id: number;
  email: string;
  isAdmin: boolean;
  plan: "FREE" | "PRO";
  proUntil: string | null;
  createdAt: string;
};

type ReportRow = {
  id: number;
  reason: string;
  detail: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reviewedAt: string | null;
  moderatorNote: string | null;
  reporter: { id: number; email: string };
  reviewedBy: { id: number; email: string } | null;
  wordbook: {
    id: number;
    title: string;
    isPublic: boolean;
    hiddenByAdmin: boolean;
    owner: { id: number; email: string };
  };
};

export function AdminUsersClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [reports, setReports] = useState<ReportRow[]>([]);
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

      const reportRes = await fetch("/api/admin/reports");
      const reportJson = (await reportRes.json()) as { reports?: ReportRow[]; error?: string };
      if (reportRes.ok) {
        setReports((reportJson.reports ?? []).map((r) => ({
          ...r,
          createdAt: new Date(r.createdAt).toISOString(),
          reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null
        })));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                const res = await fetch("/api/admin/wordbooks/recompute-rank", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: "{}"
                });
                const json = (await res.json()) as { error?: string };
                if (!res.ok) throw new Error(json.error ?? "Recompute failed.");
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Recompute failed.");
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            disabled={loading}
          >
            Recompute Rank
          </button>
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

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Reports</h2>
        {reports.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            No reports.
          </p>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-black text-slate-900">
                #{r.id} [{r.status}] {r.reason}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                wordbook #{r.wordbook.id} {r.wordbook.title} by {r.wordbook.owner.email} / reporter{" "}
                {r.reporter.email}
              </p>
              {r.detail ? <p className="mt-2 text-sm text-slate-700">{r.detail}</p> : null}
              {r.moderatorNote ? (
                <p className="mt-1 text-xs text-slate-500">note: {r.moderatorNote}</p>
              ) : null}
              {r.status === "OPEN" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/reports/${r.id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "resolve" })
                      });
                      await reload();
                    }}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const note = window.prompt("Moderator note (optional):", "") ?? "";
                      await fetch(`/api/admin/reports/${r.id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "dismiss", note })
                      });
                      await reload();
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const note = window.prompt("Hide this wordbook and resolve report. Note:", "") ?? "";
                      await fetch(`/api/admin/reports/${r.id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "hide", note })
                      });
                      await reload();
                    }}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                  >
                    Hide Wordbook
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </section>
  );
}
