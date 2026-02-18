export default function PrivacyPage() {
  return (
    <section className="ui-card-soft p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">개인정보처리방침</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        englishapp은 단어 학습 서비스를 제공하며, 로그인, 학습 진행, 결제 기능 운영에 필요한
        최소한의 개인정보만 수집합니다.
      </p>

      <div className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
        <p>
          1. 수집 항목: 계정 이메일, 암호화된 비밀번호, OAuth 계정 식별자, 단어 학습 진행 상태,
          결제 이벤트 메타데이터, 보안 로그
        </p>
        <p>
          2. 수집 목적: 계정 인증, 서비스 운영, 악용 방지, 고객 지원, 결제 처리
        </p>
        <p>
          3. 보유 기간: 계정이 활성 상태인 동안 보유하며, 법령 또는 운영상 필요가 없어진 데이터는
          삭제 또는 비식별 처리합니다.
        </p>
        <p>
          4. 제3자 제공: 개인정보를 판매하지 않으며, 서비스 운영에 필요한 인프라/결제 제공자에게만
          최소 범위로 제공합니다.
        </p>
        <p>
          5. 문의: 개인정보 관련 요청은 공식 지원 채널을 통해 서비스 운영자에게 문의할 수 있습니다.
        </p>
      </div>

      <p className="mt-6 text-xs text-slate-500">시행일: 2026년 2월 18일</p>
    </section>
  );
}
