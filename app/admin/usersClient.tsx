"use client";

import { useEffect, useState } from "react";

import { UserPlanEditor } from "@/components/admin/UserPlanEditor";
import {
  getAdminMetrics,
  getAdminReports,
  getAdminUsers,
  moderateAdminReport,
  recomputeAdminWordbookRank,
  type AdminErrorMetricRow,
  type AdminQuizQualitySummary,
  type AdminReportRow,
  type AdminRouteMetricRow,
  type AdminSloSummary,
  type AdminUserRow
} from "@/lib/api/admin";

type UserRow = AdminUserRow;
type ReportRow = AdminReportRow;
type RouteMetricRow = AdminRouteMetricRow;
type ErrorMetricRow = AdminErrorMetricRow;
type SloSummary = AdminSloSummary;
type QuizQualitySummary = AdminQuizQualitySummary;

export function AdminUsersClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetricRow[]>([]);
  const [recentErrors, setRecentErrors] = useState<ErrorMetricRow[]>([]);
  const [slo, setSlo] = useState<SloSummary | null>(null);
  const [quizQuality, setQuizQuality] = useState<QuizQualitySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState("");

  const reload = async () => {
    setRefreshing(true);
    setError("");
    try {
      const [users, reports, metrics] = await Promise.all([
        getAdminUsers(),
        getAdminReports(),
        getAdminMetrics()
      ]);
      setUsers(users);
      setReports(reports);
      setRouteMetrics(metrics.routeStats);
      setRecentErrors(metrics.recentErrors);
      setSlo(metrics.slo);
      setQuizQuality(metrics.quizQuality);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기에 실패했습니다.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void reload();
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
              setRecomputing(true);
              setError("");
              try {
                await recomputeAdminWordbookRank();
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "재계산에 실패했습니다.");
              } finally {
                setRecomputing(false);
              }
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            disabled={refreshing || recomputing}
          >
            {recomputing ? "랭킹 재계산 중..." : "랭킹 재계산"}
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            disabled={refreshing || recomputing}
          >
            {refreshing ? "새로고침 중..." : "새로고침"}
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
                단어장 #{r.wordbook.id} {r.wordbook.title} · 제작자 {r.wordbook.owner.email} / 신고자 {" "}
                {r.reporter.email}
              </p>
              {r.detail ? <p className="mt-2 text-sm text-slate-700">{r.detail}</p> : null}
              {r.moderatorNote ? (
                <p className="mt-1 text-xs text-slate-500">메모: {r.moderatorNote}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">
                신고자 신뢰도: {r.reporterTrustScore}
                {` / 품질 점수 ${r.qualityScore}`}
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
                    data-testid="admin-report-reviewing"
                    onClick={async () => {
                      const note = window.prompt("검토 메모 (선택):", "") ?? "";
                      await moderateAdminReport({ reportId: r.id, action: "review", note });
                      await reload();
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    검토 중
                  </button>
                  <button
                    type="button"
                    data-testid="admin-report-resolve"
                    onClick={async () => {
                      await moderateAdminReport({ reportId: r.id, action: "resolve" });
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
                      await moderateAdminReport({ reportId: r.id, action: "dismiss", note });
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
                      await moderateAdminReport({ reportId: r.id, action: "hide", note });
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

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">관측성 (최근 24시간)</h2>
        {slo ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-semibold text-slate-900">SLO 요약</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                API 성공률 {slo.apiSuccessRate.toFixed(2)}% / 목표 {slo.apiSuccessTarget}%
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                크론 성공률 {slo.cronSuccessRate.toFixed(2)}% / 목표 {slo.cronSuccessTarget}%
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                핵심 P95 {slo.coreP95LatencyMs}ms / 목표 {slo.coreP95LatencyTargetMs}ms
              </span>
              {quizQuality ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                  퀴즈 재검토 후보 {quizQuality.disputableWrongRate.toFixed(1)}% ({quizQuality.disputableWrongCount}/
                  {quizQuality.wrongAnswers})
                </span>
              ) : null}
            </div>
            {slo.violations.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-blue-700">
                {slo.violations.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-600">현재 SLO 위반 항목이 없습니다.</p>
            )}
          </div>
        ) : null}
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              <tr>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">4xx</th>
                <th className="px-3 py-2">5xx</th>
                <th className="px-3 py-2">Avg(ms)</th>
                <th className="px-3 py-2">P95(ms)</th>
              </tr>
            </thead>
            <tbody>
              {routeMetrics.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    수집된 지표가 없습니다.
                  </td>
                </tr>
              ) : (
                routeMetrics.map((m) => (
                  <tr key={m.route} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{m.route}</td>
                    <td className="px-3 py-2">{m.total}</td>
                    <td className="px-3 py-2">{m.status4xx}</td>
                    <td className="px-3 py-2">{m.status5xx}</td>
                    <td className="px-3 py-2">{m.avgLatencyMs}</td>
                    <td className="px-3 py-2">{m.p95LatencyMs}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">최근 오류 이벤트</h3>
          {recentErrors.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              오류 이벤트가 없습니다.
            </p>
          ) : (
            recentErrors.slice(0, 20).map((e) => (
              <div key={e.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <p className="font-semibold text-slate-800">
                  [{e.level}] {e.message}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {e.route ?? "n/a"} · {e.createdAt.slice(0, 19).replace("T", " ")}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
