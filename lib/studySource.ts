export type StudySource =
  | { kind: "core" }
  | { kind: "wordbook"; wordbookId: number };

export type DownloadedWordbookOption = {
  id: number;
  title: string;
  ownerEmail: string;
  itemCount: number;
};

export function parseStudySource(input: string | null | undefined): StudySource {
  const raw = (input ?? "core").trim();
  if (raw === "" || raw === "core") return { kind: "core" };
  if (!raw.startsWith("wb:")) return { kind: "core" };

  const id = Number(raw.slice(3));
  if (!Number.isFinite(id) || id <= 0) return { kind: "core" };
  return { kind: "wordbook", wordbookId: Math.floor(id) };
}

export function serializeStudySource(source: StudySource): string {
  if (source.kind === "core") return "core";
  return `wb:${source.wordbookId}`;
}

export function getStudySourceLabel(
  source: StudySource,
  options: DownloadedWordbookOption[]
): string {
  if (source.kind === "core") return "English 1500";
  const found = options.find((opt) => opt.id === source.wordbookId);
  return found ? found.title : `Wordbook #${source.wordbookId}`;
}

