import type { WordbookActor } from "@/server/domain/wordbook/contracts";
import { WordbookService } from "@/server/domain/wordbook/service";

type SortMode = "top" | "new" | "downloads";
type QualityMode = "all" | "curated";

export function parseMarketSort(raw: string | null): SortMode {
  if (raw === "new" || raw === "downloads" || raw === "top") return raw;
  return "top";
}

export function parseMarketQuality(raw: string | null): QualityMode {
  if (raw === "curated" || raw === "all") return raw;
  return "all";
}

export class WordbookMarketService {
  constructor(private readonly wordbookService = new WordbookService()) {}

  async list(actor: WordbookActor | null, params: {
    q: string;
    sort: SortMode;
    quality: QualityMode;
    page: number;
    take: number;
  }) {
    return this.wordbookService.listMarket(actor, params);
  }
}
