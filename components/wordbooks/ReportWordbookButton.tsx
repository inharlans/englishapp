"use client";

import { useState } from "react";

import { reportWordbook } from "@/lib/api/wordbook";

type Props = {
  wordbookId: number;
  hideHint?: boolean;
};

const reasonOptions = [
  "스팸 / 악용",
  "저작권 우려",
  "불쾌하거나 부적절한 내용",
  "오역 / 번역 품질 낮음",
  "기타"
];

export function ReportWordbookButton({ wordbookId, hideHint = false }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasonOptions[0]);
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const detailLength = detail.length;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await reportWordbook({ wordbookId, reason: reason.trim(), detail: detail.trim() || null });
      setMessage("신고가 접수되었습니다.");
      setOpen(false);
      setDetail("");
    } catch (e2) {
      setMessage(e2 instanceof Error ? e2.message : "처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="report-toggle"
        disabled={loading}
        aria-expanded={open}
        aria-controls={`report-form-${wordbookId}`}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
      >
        {open ? "신고 취소" : "신고"}
      </button>

      {!hideHint ? (
        <p className="text-[11px] text-slate-500">
          신고는 관리자 검토 후 처리됩니다. 제작자 차단은 별도 기능입니다.
        </p>
      ) : null}

      {open ? (
        <form
          id={`report-form-${wordbookId}`}
          onSubmit={onSubmit}
          className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3"
        >
          <label className="block text-xs text-slate-700">
            <span className="font-semibold">사유</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="report-reason"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              {reasonOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-700">
            <span className="font-semibold">상세 내용 (선택)</span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              data-testid="report-detail"
              rows={3}
              maxLength={2000}
              placeholder="문제 상황을 간단히 적어주세요"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
            <span className="mt-1 block text-[11px] text-slate-500">{detailLength}/2000</span>
          </label>
          <button
            type="submit"
            data-testid="report-submit"
            disabled={loading}
            aria-busy={loading}
            className="ui-btn-primary px-3 py-1.5 text-xs disabled:opacity-60"
          >
            {loading ? "신고 중..." : "신고 제출"}
          </button>
        </form>
      ) : null}

      {message ? (
        <p className="text-[11px] text-slate-600" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}



