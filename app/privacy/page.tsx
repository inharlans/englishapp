import { getBusinessInfo } from "@/lib/businessInfo";

export default function PrivacyPage() {
  const business = getBusinessInfo();
  const supportEmail = business.supportEmail || "준비 중";
  const supportPhone = business.supportPhone || "준비 중";
  const supportHours = business.supportHours ? ` (${business.supportHours})` : "";

  return (
    <section className="ui-card-soft p-6 sm:p-8" aria-labelledby="privacy-title">
      <h1 id="privacy-title" className="text-2xl font-extrabold tracking-tight text-slate-900">
        개인정보처리방침
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        englishapp은 단어 학습 서비스를 제공하며, 로그인, 학습 진행, 결제 기능 운영에 필요한 최소한의 개인정보만 수집합니다.
      </p>

      <div className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
        <p>1. 수집 항목: 계정 이메일, 암호화된 비밀번호, OAuth 계정 식별자, 단어 학습 진행 상태, 결제 이벤트 메타데이터, 보안 로그</p>
        <p>2. 수집 목적: 계정 인증, 서비스 운영, 악용 방지, 고객 지원, 결제 처리</p>
        <p>3. 보유 기간: 계정이 활성 상태인 동안 보유하며, 법령 또는 운영상 필요가 없어진 데이터는 삭제 또는 비식별 처리합니다.</p>
        <p>4. 제3자 제공: 개인정보를 판매하지 않으며, 서비스 운영에 필요한 인프라/결제 제공자에게만 최소 범위로 제공합니다.</p>
        <p>5. 문의: 개인정보 관련 요청은 공식 지원 채널을 통해 서비스 운영자에게 문의할 수 있습니다.</p>
        <p>
          6. 개인정보 문의처: {supportEmail} / {supportPhone}
          {supportHours}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <p className="font-bold text-slate-900">Chrome 확장(Englishapp PDF Clipper) 개인정보 안내</p>
        <p className="mt-2">- 사용자가 텍스트를 선택하고 `단어장에 추가`를 클릭한 경우에만 단어/예문(있는 경우)/출처 URL/출처 제목이 Englishapp 서버로 전송됩니다.</p>
        <p>- 확장은 사이트 로그인 세션(쿠키) 기반으로 요청을 수행하며, 계정 비밀번호를 저장하지 않습니다.</p>
        <p>- 전송된 데이터는 단어장 저장 및 학습 기능 제공 목적으로만 사용되며, 삭제/정정 요청은 개인정보 문의처를 통해 접수할 수 있습니다.</p>
      </div>

      <p className="mt-6 text-xs text-slate-500">시행일: 2026년 2월 18일 / 최종 수정일: 2026년 3월 2일</p>
    </section>
  );
}
