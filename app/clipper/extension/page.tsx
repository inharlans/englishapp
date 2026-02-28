import Link from "next/link";

const downloadHref = "/api/clipper/extension";

export default function ClipperExtensionPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Englishapp Clipper</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">크롬 확장 설치</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
          PDF/웹 문서에서 단어를 드래그해 바로 Englishapp 단어장으로 보내는 확장입니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={downloadHref}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            확장 ZIP 다운로드
          </a>
          <Link
            href="/clipper/add"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            브릿지 페이지 보기
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">설치 순서</h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-700">
            <li>1. 위 버튼으로 ZIP 파일을 내려받아 압축을 풉니다.</li>
            <li>2. 크롬 주소창에 `chrome://extensions`를 엽니다.</li>
            <li>3. 우측 상단 `개발자 모드`를 켭니다.</li>
            <li>4. `압축해제된 확장 프로그램 로드`로 압축 해제 폴더를 선택합니다.</li>
          </ol>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">테스트 순서</h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-700">
            <li>1. 로그인 상태에서 PDF/웹 문서에서 영어 단어를 드래그합니다.</li>
            <li>2. `단어장에 추가` 버튼을 눌러 브릿지 페이지를 엽니다.</li>
            <li>3. 저장 완료 메시지(`created`/`duplicate`)를 확인합니다.</li>
            <li>4. 내 단어장에서 항목이 추가되었는지 확인합니다.</li>
          </ol>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">로컬/스테이징 연결</h2>
        <p className="mt-3 text-sm text-slate-700">
          설치 후 확장 세부정보의 <strong>확장 프로그램 옵션</strong>에서 브릿지 Origin을 바꿀 수 있습니다.
          예) `http://localhost:3000`.
        </p>
      </article>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">권한 안내</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>- `activeTab`: 선택한 탭에서 드래그된 단어를 읽기 위해 사용합니다.</li>
            <li>- `storage`: 브릿지 Origin(`bridgeOrigin`) 설정을 저장하기 위해 사용합니다.</li>
            <li>- `&lt;all_urls&gt;`: PDF/웹 문서 전반에서 클리퍼 버튼을 띄우기 위해 사용합니다.</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">업데이트 방법</h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-700">
            <li>1. 새 ZIP을 내려받아 같은 폴더에 압축 해제합니다.</li>
            <li>2. `chrome://extensions`에서 기존 확장의 `새로고침`을 누릅니다.</li>
            <li>3. 문제가 있으면 기존 확장을 제거 후 다시 로드합니다.</li>
          </ol>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">스크린샷 체크 포인트</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>- 설치 화면: `chrome://extensions`의 개발자 모드 + 압축해제 로드 버튼</li>
          <li>- 옵션 화면: `bridgeOrigin` 입력/저장 완료 메시지</li>
          <li>- 동작 화면: 텍스트 드래그 후 `단어장에 추가` 플로팅 버튼</li>
        </ul>
      </article>
    </section>
  );
}
