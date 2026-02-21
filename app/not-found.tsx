import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-[0_22px_55px_-35px_rgba(15,23,42,0.65)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">404</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        주소가 바뀌었거나 삭제된 페이지일 수 있습니다. 아래 바로가기로 이동해 계속 학습을 진행하세요.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link href="/" className="ui-btn-secondary px-4 py-2 text-sm">
          홈으로 이동
        </Link>
        <Link href="/wordbooks" className="ui-btn-primary px-4 py-2 text-sm">
          내 단어장
        </Link>
        <Link href="/wordbooks/market" className="ui-btn-secondary px-4 py-2 text-sm">
          마켓 보기
        </Link>
        <Link href="/offline" className="ui-btn-secondary px-4 py-2 text-sm">
          오프라인 라이브러리
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">확인 팁</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>주소(`/wordbooks/[id]`)에서 숫자 ID가 정확한지 확인하세요.</li>
          <li>로그인 권한이 필요한 페이지는 먼저 로그인 후 접근하세요.</li>
          <li>관리자 경로는 운영 계정에서만 열릴 수 있습니다.</li>
        </ul>
      </div>
    </section>
  );
}
