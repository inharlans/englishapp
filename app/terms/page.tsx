import { getBusinessInfo } from "@/lib/businessInfo";

export default function TermsPage() {
  const business = getBusinessInfo();
  const supportEmail = business.supportEmail || "준비 중";
  const supportPhone = business.supportPhone || "준비 중";
  const supportHours = business.supportHours ? ` (${business.supportHours})` : "";
  const supportActionHref = business.supportEmail ? `mailto:${business.supportEmail}` : "/wordbooks";
  const supportActionLabel = business.supportEmail ? "약관 문의 메일 보내기" : "내 단어장으로";

  return (
    <section className="ui-card-soft p-6 sm:p-8" aria-labelledby="terms-title">
      <h1 id="terms-title" className="text-2xl font-extrabold tracking-tight text-slate-900">
        서비스 이용약관
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        본 약관은 englishapp 서비스의 이용과 관련된 권리, 의무, 책임 사항을 규정합니다.
      </p>

      <div className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
        <p>1. 이용자는 계정 보안을 유지할 책임이 있으며, 계정에서 발생하는 활동에 대해 책임을 집니다.</p>
        <p>2. 이용자는 서비스 오남용, 운영 방해, 관련 법령 위반 행위를 해서는 안 됩니다.</p>
        <p>3. 서비스 기능은 변경될 수 있으며, 가능한 경우 사전 고지를 통해 변경 또는 중단될 수 있습니다.</p>
        <p>4. 유료 요금제 및 정기 결제는 가격 페이지에 표시된 요금 및 결제 조건을 따릅니다.</p>
        <p>5. 디지털 서비스 특성상 결제 후 즉시 서비스가 개시되며, 환불/해지는 관련 법령 및 결제사 정책에 따라 처리합니다.</p>
        <p>6. 이용자는 계정 삭제를 요청할 수 있으며, 법령상 보관 의무가 있는 정보는 예외로 합니다.</p>
        <p>
          7. 고객센터: {supportEmail} / {supportPhone}
          {supportHours}
        </p>
      </div>

      <a href={supportActionHref} className="mt-6 inline-flex w-fit ui-btn-accent px-4 py-2 text-sm">
        {supportActionLabel}
      </a>

      <p className="mt-6 text-xs text-slate-500">시행일: 2026년 2월 18일</p>
    </section>
  );
}
