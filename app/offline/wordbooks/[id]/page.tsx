import { StudyClient } from "./StudyClient";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export default async function OfflineWordbookStudyPage(props: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await props.params;
  const id = parseId(idRaw);
  return <StudyClient id={id ?? -1} />;
}

