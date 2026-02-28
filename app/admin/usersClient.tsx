"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { UserPlanEditor } from "@/components/admin/UserPlanEditor";
import {
  getAdminMetrics,
  getAdminReports,
  getAdminUsers,
  moderateAdminReport,
  recomputeAdminWordbookRank,
  type AdminClipperMetrics,
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
type ClipperMetrics = AdminClipperMetrics;

function formatUtcBucketLabel(hourIso: string, dense: boolean): string {
  const d = new Date(hourIso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (dense) return `${hh}:${mm}`;
  const mmn = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mmn}-${dd} ${hh}:${mm}`;
}

const REASON_LABELS: Record<string, string> = {
  RATE_LIMIT: "요청 제한(429)",
  TIMEOUT: "타임아웃",
  NETWORK: "네트워크 오류",
  PARSE_ERROR: "응답 파싱 오류",
  ITEM_NOT_FOUND_AFTER_CLAIM: "Claim 후 항목 누락",
  ITEM_MISSING_OR_INVALID: "응답 항목 누락/불량",
  BATCH_REQUEST_FAILED: "배치 요청 실패",
  BATCH_FALLBACK_FAILED: "배치 fallback 실패",
  GOOGLE_TRANSLATE_FALLBACK_EMPTY: "번역 fallback 빈 결과",
  UNKNOWN: "알 수 없음",
  OTHERS: "기타"
};

function getReasonLabel(code: string): string {
  return REASON_LABELS[code] ?? code;
}

export function AdminUsersClient({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetricRow[]>([]);
  const [recentErrors, setRecentErrors] = useState<ErrorMetricRow[]>([]);
  const [slo, setSlo] = useState<SloSummary | null>(null);
  const [quizQuality, setQuizQuality] = useState<QuizQualitySummary | null>(null);
  const [clipper, setClipper] = useState<ClipperMetrics | null>(null);
  const [clipperWindow, setClipperWindow] = useState<"1h" | "24h" | "7d">("24h");
  const [alertLevelFilter, setAlertLevelFilter] = useState<"all" | "warn" | "critical">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState("");
  const reloadRequestIdRef = useRef(0);

  const reload = useCallback(async (options?: { clipperRefresh?: boolean }) => {
    const requestId = reloadRequestIdRef.current + 1;
    reloadRequestIdRef.current = requestId;
    setRefreshing(true);
    setError("");
    try {
      const [users, reports, metrics] = await Promise.all([
        getAdminUsers(),
        getAdminReports(),
        getAdminMetrics({
          clipperWindow,
          clipperRefresh: options?.clipperRefresh ?? false
        })
      ]);
      if (reloadRequestIdRef.current !== requestId) return;
      setUsers(users);
      setReports(reports);
      setRouteMetrics(metrics.routeStats);
      setRecentErrors(metrics.recentErrors);
      setSlo(metrics.slo);
      setQuizQuality(metrics.quizQuality);
      setClipper(metrics.clipper);
    } catch (e) {
      if (reloadRequestIdRef.current !== requestId) return;
      setError(e instanceof Error ? e.message : "불러오기에 실패했습니다.");
    } finally {
      if (reloadRequestIdRef.current === requestId) {
        setRefreshing(false);
      }
    }
  }, [clipperWindow]);

  useEffect(() => {
    void reload();
  }, [reload]);

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

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">클리퍼 운영 대시보드</h2>
          <div className="ml-auto flex flex-wrap gap-2">
            {([
              ["1h", "1시간"],
              ["24h", "24시간"],
              ["7d", "7일"]
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setClipperWindow(value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  clipperWindow === value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void reload({ clipperRefresh: true })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              disabled={refreshing}
            >
              {refreshing ? "갱신 중..." : "캐시 무시 갱신"}
            </button>
          </div>
        </div>

        {clipper ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">대기열</p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  Q {clipper.queue.queued} / P {clipper.queue.processing}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">대기시간 P95</p>
                <p className="mt-1 text-lg font-black text-slate-900">{clipper.queue.waitMs.p95}ms</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">성공률</p>
                <p className="mt-1 text-lg font-black text-slate-900">{(clipper.quality.successRate * 100).toFixed(2)}%</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  실패 추세:
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 font-semibold ${
                      clipper.trend.delta > 0
                        ? "bg-blue-50 text-blue-700"
                        : clipper.trend.delta < 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {clipper.trend.delta > 0 ? "▲" : clipper.trend.delta < 0 ? "▼" : "-"}
                    {Math.abs(clipper.trend.delta)}
                    {clipper.trend.pct === null ? " (new)" : ` (${(clipper.trend.pct * 100).toFixed(1)}%)`}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">토큰 추정</p>
                <p className="mt-1 text-lg font-black text-slate-900">{clipper.cost.tokenEstimate.toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
              <p>
                캐시 모드: <span className="font-semibold text-slate-900">{clipper.cache.mode}</span>
                {clipper.cache.mode === "ttl-5m" ? ` (TTL ${clipper.cache.ttlSec}s)` : ""}
                {clipper.cache.hit ? " / 캐시 적중" : " / 캐시 미적중"}
              </p>
              <p className="mt-1">
                정책 버전 {clipper.policy.version}
              </p>
              <p className="mt-1">주요 실패: {clipper.topFailures.map((r) => `${r.code}(${r.count})`).join(", ") || "없음"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">시간대별 처리량 (UTC)</p>
                <p className="text-[11px] text-slate-500">완료 / 실패 누적 막대</p>
              </div>
              {clipper.series.hourly.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  시계열 데이터가 없습니다.
                </p>
              ) : (
                (() => {
                  const rows = [...clipper.series.hourly].sort((a, b) => a.hour.localeCompare(b.hour));
                  const maxValue = Math.max(1, ...rows.map((row) => row.doneCount + row.failedCount));
                  const dense = rows.length > 36;
                  return (
                    <div className="space-y-2">
                      <div className="flex h-40 items-end gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                        {rows.map((row) => {
                          const total = row.doneCount + row.failedCount;
                          const totalHeightPct = (total / maxValue) * 100;
                          const doneHeightPct = total > 0 ? (row.doneCount / total) * totalHeightPct : 0;
                          const failedHeightPct = total > 0 ? (row.failedCount / total) * totalHeightPct : 0;
                          return (
                            <div
                              key={row.hour}
                              className="group relative flex h-full min-w-[8px] flex-col justify-end"
                              title={`${row.hour} | 완료 ${row.doneCount} / 실패 ${row.failedCount}`}
                            >
                              <div
                                className="w-2 rounded-b-sm bg-blue-300"
                                style={{ height: `${failedHeightPct}%` }}
                                aria-hidden
                              />
                              <div
                                className="w-2 rounded-t-sm bg-emerald-500"
                                style={{ height: `${doneHeightPct}%` }}
                                aria-hidden
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden /> 완료
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-sm bg-blue-300" aria-hidden /> 실패
                        </span>
                        <span>최대 버킷 합계: {maxValue}</span>
                        <span>
                          범위: {formatUtcBucketLabel(rows[0]?.hour ?? "", dense)} ~ {formatUtcBucketLabel(rows[rows.length - 1]?.hour ?? "", dense)}
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">실패 사유 TopN</p>
                <p className="text-[11px] text-slate-500">상위 5개 + 기타</p>
              </div>
              {clipper.topFailures.length === 0 && clipper.topFailuresOthersCount === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  실패 사유 데이터가 없습니다.
                </p>
              ) : (
                (() => {
                  const rows = [
                    ...clipper.topFailures,
                    ...(clipper.topFailuresOthersCount > 0
                      ? [{ code: "OTHERS", count: clipper.topFailuresOthersCount }]
                      : [])
                  ];
                  const maxCount = Math.max(1, ...rows.map((row) => row.count));
                  return (
                    <ul className="space-y-2">
                      {rows.map((row) => {
                        const width = `${Math.max(4, Math.round((row.count / maxCount) * 100))}%`;
                        return (
                          <li key={row.code} className="grid grid-cols-[140px_1fr_44px] items-center gap-2 text-xs">
                            <span className="truncate text-slate-700" title={row.code}>
                              {getReasonLabel(row.code)}
                            </span>
                            <div className="h-2.5 rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-blue-400" style={{ width }} aria-hidden />
                            </div>
                            <span className="text-right font-semibold text-slate-700">{row.count}</span>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">현재 알림</p>
                <div className="ml-auto flex gap-1">
                  {([
                    ["all", "전체"],
                    ["warn", "WARN"],
                    ["critical", "CRITICAL"]
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAlertLevelFilter(value)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                        alertLevelFilter === value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {(alertLevelFilter === "all"
                ? clipper.alerts
                : clipper.alerts.filter((alert) => alert.level === alertLevelFilter)
              ).length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">알림 없음</p>
              ) : (
                <ul className="space-y-2">
                  {(alertLevelFilter === "all"
                    ? clipper.alerts
                    : clipper.alerts.filter((alert) => alert.level === alertLevelFilter)
                  ).map((alert) => (
                    <li
                      key={`${alert.key}:${alert.level}`}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        alert.level === "critical"
                          ? "border-blue-200 bg-blue-50 text-blue-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      [{alert.level.toUpperCase()}] {alert.message} (현재 {alert.value} / warn {alert.warn} / critical {alert.critical})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            클리퍼 운영 지표를 불러오지 못했습니다. `CRON_SECRET` 설정과 내부 메트릭 경로를 확인해 주세요.
          </p>
        )}
      </section>
    </section>
  );
}
