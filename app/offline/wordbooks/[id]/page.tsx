import Link from "next/link";

import { StudyClient } from "./StudyClient";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export default async function OfflineWordbookStudyPage(props: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await props.params;
  const id = parseId(idRaw);
  if (!id) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">잘못된 단어장입니다</h1>
        <p className="text-sm text-slate-600">오프라인 라이브러리에서 다시 선택해 주세요.</p>
        <Link href={{ pathname: "/offline" }} className="text-sm font-semibold text-blue-700 hover:underline">
          오프라인 라이브러리로 이동
        </Link>
      </section>
    );
  }

  return <StudyClient id={id} />;
}
