export default function TermsPage() {
  return (
    <section className="ui-card-soft p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">서비스 이용약관</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        본 약관은 Oingapp(이하 서비스)의 이용과 관련하여 서비스와 이용자의 권리, 의무 및 책임사항을 규정합니다.
      </p>

      <div className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
        <p>1. 이용자는 본 약관 및 관련 법령을 준수해야 합니다.</p>
        <p>2. 이용자는 타인의 권리를 침해하거나 서비스 운영을 방해하는 행위를 해서는 안 됩니다.</p>
        <p>3. 서비스는 운영상 필요 시 기능을 변경하거나 중단할 수 있으며, 중요한 변경은 사전 안내합니다.</p>
        <p>4. 소셜 로그인 사용 시 각 제공자(구글/네이버/카카오)의 정책이 함께 적용될 수 있습니다.</p>
        <p>5. 이용자는 언제든지 계정 탈퇴를 요청할 수 있으며, 탈퇴 시 관련 데이터는 정책에 따라 처리됩니다.</p>
      </div>

      <p className="mt-6 text-xs text-slate-500">시행일: 2026-02-17</p>
    </section>
  );
}
