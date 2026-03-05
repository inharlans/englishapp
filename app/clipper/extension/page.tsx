import Link from "next/link";

const webStoreHref = "https://chromewebstore.google.com/detail/englishapp-pdf-clipper/gkcgpghjdioobdkedblkjehhbkkhfakb";

export default function ClipperExtensionPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Englishapp Extension</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">확장자 설치</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
          Englishapp PDF Clipper는 PDF/웹 문서에서 영어 단어를 선택하면 바로 내 단어장으로 보내주는 크롬 확장자입니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={webStoreHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            확장자 설치
          </a>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">어떤 확장자인가요?</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            읽고 있는 문서에서 단어를 선택하면 저장 버튼이 떠서, 학습 흐름을 끊지 않고 단어장을 채울 수 있는 학습용 확장자입니다.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">왜 써야 하나요?</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>- 복사/붙여넣기 없이 모르는 단어를 바로 저장할 수 있습니다.</li>
            <li>- 저장 즉시 단어장 복습으로 이어져 학습 전환이 빨라집니다.</li>
            <li>- 읽기, 정리, 암기를 하나의 흐름으로 연결할 수 있습니다.</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">언제 쓰면 좋나요?</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>- 논문, 기사, PDF를 읽다가 낯선 단어를 만났을 때</li>
            <li>- 시험 준비 중 빈출 단어를 빠르게 모으고 싶을 때</li>
            <li>- 이동 중 읽은 콘텐츠도 학습 자산으로 남기고 싶을 때</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">사용법</h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-700">
            <li>1. 문서에서 영어 단어를 드래그합니다.</li>
            <li>2. 떠오르는 `단어장에 추가` 버튼을 누릅니다.</li>
            <li>3. 내 단어장에서 바로 복습을 시작합니다.</li>
          </ol>
        </article>
      </div>

      <p className="text-sm text-slate-600">
        설치 후에는 <Link href="/wordbooks" className="font-semibold underline underline-offset-4">내 단어장</Link>에서 저장한 단어를
        바로 확인하고 복습할 수 있습니다.
      </p>
    </section>
  );
}
