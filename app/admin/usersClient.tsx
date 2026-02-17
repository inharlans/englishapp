"use client";

import { apiFetch } from "@/lib/clientApi";

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
  reporterTrustScore: number;
  createdAt: string;
  reviewedAt: string | null;
  moderatorNote: string | null;
  reviewAction: string | null;
  previousStatus: "OPEN" | "RESOLVED" | "DISMISSED" | null;
  nextStatus: "OPEN" | "RESOLVED" | "DISMISSED" | null;
  reviewerIpHash: string | null;
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
      const res = await apiFetch("/api/admin/users");
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
      if (!res.ok) throw new Error(json.error ?? "불러오기에 실패했습니다.");
      setUsers((json.users ?? []) as UserRow[]);

      const reportRes = await apiFetch("/api/admin/reports");
      const reportJson = (await reportRes.json()) as { reports?: ReportRow[]; error?: string };
      if (reportRes.ok) {
        setReports((reportJson.reports ?? []).map((r) => ({
          ...r,
          createdAt: new Date(r.createdAt).toISOString(),
          reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null
        })));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기에 실패했습니다.");
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">관리자</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">사용자</h1>
          <p className="mt-2 text-sm text-slate-600">요금제/관리자 권한을 설정합니다.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                const res = await apiFetch("/api/admin/wordbooks/recompute-rank", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: "{}"
                });
                const json = (await res.json()) as { error?: string };
                if (!res.ok) throw new Error(json.error ?? "재계산에 실패했습니다.");
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "재계산에 실패했습니다.");
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            disabled={loading}
          >
            랭킹 재계산
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            disabled={loading}
          >
            {loading ? "새로고침 중..." : "새로고침"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
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
                  생성일 {u.createdAt.slice(0, 10)} · 요금제 {u.plan}
                  {u.isAdmin ? " · 관리자" : ""}
                  {u.proUntil ? ` · proUntil ${u.proUntil}` : ""}
                </p>
              </div>
            </div>
            <UserPlanEditor user={u} onUpdated={() => void reload()} />
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">신고</h2>
        {reports.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            신고 내역이 없습니다.
          </p>
        ) : (
          reports.map((r) => (
            <div key={r.id} data-testid="admin-report-card" className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-black text-slate-900">
                #{r.id} [{r.status}] {r.reason}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                단어장 #{r.wordbook.id} {r.wordbook.title} · 제작자 {r.wordbook.owner.email} / 신고자{" "}
                {r.reporter.email}
              </p>
              {r.detail ? <p className="mt-2 text-sm text-slate-700">{r.detail}</p> : null}
              {r.moderatorNote ? (
                <p className="mt-1 text-xs text-slate-500">메모: {r.moderatorNote}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">
                신고자 신뢰도: {r.reporterTrustScore}
                {r.reviewAction ? ` / 조치 ${r.reviewAction}` : ""}
                {r.previousStatus && r.nextStatus ? ` / ${r.previousStatus} -> ${r.nextStatus}` : ""}
              </p>
              {r.reviewerIpHash ? (
                <p className="mt-1 text-[11px] text-slate-400">검토자 IP 해시: {r.reviewerIpHash}</p>
              ) : null}
              {r.status === "OPEN" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="admin-report-resolve"
                    onClick={async () => {
                      await apiFetch(`/api/admin/reports/${r.id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "resolve" })
                      });
                      await reload();
                    }}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                  >
                    처리 완료
                  </button>
                  <button
                    type="button"
                    data-testid="admin-report-dismiss"
                    onClick={async () => {
                      const note = window.prompt("관리자 메모 (선택):", "") ?? "";
                      await apiFetch(`/api/admin/reports/${r.id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "dismiss", note })
                      });
                      await reload();
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    기각
                  </button>
                  <button
                    type="button"
                    data-testid="admin-report-hide"
                    onClick={async () => {
                      const note = window.prompt("이 단어장을 숨기고 신고를 처리합니다. 메모:", "") ?? "";
                      await apiFetch(`/api/admin/reports/${r.id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "hide", note })
                      });
                      await reload();
                    }}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                  >
                    단어장 숨김
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




