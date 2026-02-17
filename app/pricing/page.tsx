import Link from "next/link";
import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

export default async function PricingPage() {
  const user = await getUserFromRequestCookies(await cookies());

  const downloadsUsed = user
    ? await prisma.wordbookDownload.count({ where: { userId: user.id } })
    : null;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">요금제</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            무료 vs 프로
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            프로 요금제는 다운로드 제한을 해제하고 비공개 단어장을 사용할 수 있습니다.
          </p>
          {user ? (
            <p className="mt-1 text-xs text-slate-500">
              현재 요금제: <span className="font-semibold">{planLabel(user.plan)}</span>
              {user.plan === "FREE" && typeof downloadsUsed === "number" ? (
                <>
                  {" "}
                  - 다운로드 사용량: <span className="font-semibold">{downloadsUsed}/3</span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">로그인하면 사용량을 볼 수 있습니다.</p>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/wordbooks" }}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            내 단어장
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.25)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">무료</p>
          <p className="mt-2 text-3xl font-black text-slate-900">0 KRW</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>다운로드: 평생 3회</li>
            <li>업로드: 공개 고정</li>
            <li>다운로드한 단어장 오프라인 저장</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.25)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">프로</p>
              <p className="mt-2 text-3xl font-black text-slate-900">월 2,900원</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">연 29,000원</p>
            </div>
            <span className="ui-badge-accent px-3 py-1 text-xs">
              추천
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>다운로드: 무제한</li>
            <li>업로드: 공개/비공개 선택 가능</li>
            <li>오프라인 중심 학습 흐름</li>
          </ul>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            결제는 아직 연동되지 않았습니다. 현재는 관리자가{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">/admin</code>{" "}
            에서 계정을 업그레이드할 수 있습니다.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        무료 다운로드 한도에 도달하면 프로로 업그레이드해 계속 다운로드할 수 있습니다.
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        구독 해지 또는 PRO에서 FREE로 변경되면, 기존 비공개 단어장은 자동 삭제되지 않지만 잠금 상태가 됩니다.
        잠금 상태에서는 학습/수정이 불가하며 공개 전환 또는 PRO 재구독 후 다시 사용할 수 있습니다.
      </div>
    </section>
  );
}


  const planLabel = (plan: "FREE" | "PRO") => (plan === "FREE" ? "무료" : "프로");
