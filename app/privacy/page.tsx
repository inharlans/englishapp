export default function PrivacyPage() {
  return (
    <section className="ui-card-soft p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">개인정보처리방침</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Oingapp(이하 서비스)는 소셜 로그인 및 학습 서비스 제공을 위해 필요한 최소한의 개인정보만 처리합니다.
      </p>

      <div className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
        <p>
          1. 수집 항목: 이메일, 소셜 로그인 제공자의 고유 식별자, 서비스 이용 기록(단어장/학습 상태 등)
        </p>
        <p>2. 수집 목적: 회원 식별, 로그인 인증, 계정 연동, 서비스 제공 및 운영</p>
        <p>
          3. 보유 기간: 회원 탈퇴 시 지체 없이 파기하며, 관련 법령에 따라 보관이 필요한 정보는 해당 기간 동안만
          보관합니다.
        </p>
        <p>4. 제3자 제공: 법령상 근거가 있거나 이용자 동의가 있는 경우를 제외하고 제3자에게 제공하지 않습니다.</p>
        <p>5. 문의: 개인정보 관련 문의는 서비스 운영자에게 요청할 수 있습니다.</p>
      </div>

      <p className="mt-6 text-xs text-slate-500">시행일: 2026-02-17</p>
    </section>
  );
}
