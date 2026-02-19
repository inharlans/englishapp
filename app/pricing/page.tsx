import Link from "next/link";
import { cookies } from "next/headers";

import { PricingActions } from "@/components/payments/PricingActions";
import { getUserFromRequestCookies } from "@/lib/authServer";
import { FREE_DOWNLOAD_WORD_LIMIT, getUserDownloadedWordCount } from "@/lib/planLimits";

export default async function PricingPage(props: { searchParams: Promise<{ payment?: string }> }) {
  const sp = await props.searchParams;
  const user = await getUserFromRequestCookies(await cookies());

  const downloadWordsUsed = user ? await getUserDownloadedWordCount(user.id) : null;
  const paymentEnabled = Boolean(
    process.env.PORTONE_API_SECRET && process.env.PORTONE_STORE_ID && process.env.PORTONE_CHANNEL_KEY
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">요금제</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">무료 vs 프로</h1>
          <p className="mt-2 text-sm text-slate-600">
            프로 요금제는 다운로드 한도를 해제하고 비공개 단어장을 사용할 수 있습니다.
          </p>
          {user ? (
            <p className="mt-1 text-xs text-slate-500">
              현재 요금제: <span className="font-semibold">{planLabel(user.plan)}</span>
              {user.plan === "FREE" && typeof downloadWordsUsed === "number" ? (
                <>
                  {" "}
                  - 다운로드 사용량 {" "}
                  <span className="font-semibold">
                    {downloadWordsUsed}/{FREE_DOWNLOAD_WORD_LIMIT}단어
                  </span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              가격 정보는 로그인 없이 볼 수 있고, 실제 결제 단계에서 로그인합니다.
            </p>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={{ pathname: "/privacy" }} className="ui-btn-secondary px-4 py-2 text-sm">
            개인정보처리방침
          </Link>
          <Link href={{ pathname: "/terms" }} className="ui-btn-secondary px-4 py-2 text-sm">
            서비스 약관
          </Link>
          <Link href={{ pathname: "/wordbooks" }} className="ui-btn-secondary px-4 py-2 text-sm">
            내 단어장
          </Link>
        </div>
      </header>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">요금제 요약</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>FREE: 단어장 생성 1개, 다운로드 누적 {FREE_DOWNLOAD_WORD_LIMIT}단어, 비공개 업로드 불가</li>
          <li>PRO: 단어장 생성/다운로드 무제한, 공개/비공개 선택 가능</li>
          <li>PRO에서 FREE로 변경되면 기존 비공개 단어장은 자동 삭제되지 않지만 잠금 상태가 됩니다.</li>
          <li>잠금 상태에서는 학습/수정이 불가하며 공개 전환 또는 PRO 복구 후 다시 사용할 수 있습니다.</li>
        </ul>
      </div>

      {sp.payment === "success" ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          결제가 완료되었습니다. 결제 상태는 자동으로 반영됩니다.
        </div>
      ) : null}

      {sp.payment === "cancel" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          결제가 취소되었습니다. 아래 버튼으로 다시 시도할 수 있습니다.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.25)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">무료</p>
          <p className="mt-2 text-3xl font-black text-slate-900">0 KRW</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>다운로드: 누적 {FREE_DOWNLOAD_WORD_LIMIT}단어</li>
            <li>단어장 생성: 평생 1개</li>
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
            <span className="ui-badge-accent px-3 py-1 text-xs">추천</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>다운로드: 무제한</li>
            <li>단어장 생성: 무제한</li>
            <li>업로드: 공개/비공개 선택 가능</li>
            <li>중단 없는 학습 흐름</li>
          </ul>
          <PricingActions plan={user?.plan ?? null} paymentEnabled={paymentEnabled} isLoggedIn={Boolean(user)} />
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            결제 및 구독 상태는 PortOne 웹훅으로 자동 반영됩니다. 이상 시 관리자에게 문의해 주세요.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        무료 다운로드 누적 한도에 도달하면 PRO로 업그레이드해 계속 다운로드할 수 있습니다.
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">환불/해지 안내</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>구독 해지는 결제사 고객센터 또는 구독 관리에서 가능합니다.</li>
          <li>이미 결제된 기간은 사용 가능하며, 다음 결제부터 자동 청구가 중단됩니다.</li>
          <li>환불 정책은 결제사 약관 및 관련 법령을 따릅니다.</li>
        </ul>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">자주 묻는 질문</p>
        <div className="mt-3 space-y-2">
          <p><span className="font-semibold">Q.</span> 무료에서도 가격표를 볼 수 있나요?</p>
          <p className="text-slate-600"><span className="font-semibold">A.</span> 네, 로그인 없이 가격/혜택/약관을 확인할 수 있습니다.</p>
          <p><span className="font-semibold">Q.</span> 결제 실패 후 다시 시도할 수 있나요?</p>
          <p className="text-slate-600"><span className="font-semibold">A.</span> 가능합니다. 같은 페이지에서 다시 결제를 진행하면 됩니다.</p>
        </div>
      </section>
    </section>
  );
}

const planLabel = (plan: "FREE" | "PRO") => (plan === "FREE" ? "무료" : "프로");
