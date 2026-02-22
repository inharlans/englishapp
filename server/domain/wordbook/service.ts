import { isPrivateWordbookLockedForFree } from "@/lib/wordbookAccess";
import { shouldHideWordbookFromMarket } from "@/lib/wordbookPolicy";
import { splitWordbookDescription } from "@/lib/wordbookPresentation";
import { computeWordbookRankScore } from "@/lib/wordbookRanking";
import { getEffectivePlan } from "@/lib/userPlan";
import type {
  CreateWordbookInput,
  MarketQuery,
  UpdateWordbookInput,
  WordbookActor
} from "@/server/domain/wordbook/contracts";
import { WordbookRepository } from "@/server/domain/wordbook/repository";

export class WordbookService {
  constructor(private readonly repo = new WordbookRepository()) {}

  async listMine(actor: WordbookActor) {
    return this.repo.listOwnedWordbooks(actor.id);
  }

  async createMine(actor: WordbookActor, input: CreateWordbookInput) {
    const effectivePlan = getEffectivePlan({ plan: actor.plan, proUntil: actor.proUntil });
    if (effectivePlan === "FREE") {
      const createdCount = await this.repo.countOwnedWordbooks(actor.id);
      if (createdCount >= 1) {
        return {
          ok: false as const,
          status: 403,
          error: "무료 요금제는 단어장 1개만 생성할 수 있습니다. PRO로 업그레이드해 주세요."
        };
      }
    }

    const wordbook = await this.repo.createWordbook(actor.id, input, effectivePlan === "FREE");
    await this.repo.updateRankScore(
      wordbook.id,
      computeWordbookRankScore({
        ratingAvg: 0,
        ratingCount: 0,
        downloadCount: 0,
        createdAt: wordbook.createdAt
      })
    );

    return { ok: true as const, wordbook };
  }

  async listMarket(actor: WordbookActor | null, query: Omit<MarketQuery, "blockedOwnerIds">) {
    const blockedOwnerIds = actor ? await this.repo.findBlockedOwnerIds(actor.id) : [];
    const candidates = await this.repo.findMarketCandidates({ ...query, blockedOwnerIds });

    const eligibleIds = candidates
      .filter(
        (wb) =>
          !shouldHideWordbookFromMarket({
            title: wb.title,
            description: wb.description,
            ownerEmail: wb.owner.email,
            itemCount: wb._count.items
          })
      )
      .map((wb) => wb.id);

    const total = eligibleIds.length;
    const pageIds = eligibleIds.slice(query.page * query.take, query.page * query.take + query.take);
    const unordered = await this.repo.findMarketPageByIds(pageIds);
    const byId = new Map(unordered.map((wb) => [wb.id, wb] as const));
    const wordbooks = pageIds.map((id) => byId.get(id)).filter((v): v is NonNullable<typeof v> => v !== undefined);

    return {
      total,
      page: query.page,
      take: query.take,
      sort: query.sort,
      q: query.q,
      wordbooks: wordbooks.map((wb) => {
        const desc = splitWordbookDescription(wb.description);
        return { ...wb, displayDescription: desc.displayDescription, internalSource: desc.internalSource };
      })
    };
  }

  async getByIdForActor(actor: WordbookActor, wordbookId: number) {
    const wordbook = await this.repo.findByIdWithItems(wordbookId);
    if (!wordbook) {
      return { ok: false as const, status: 404, error: "Not found." };
    }

    const isOwner = wordbook.ownerId === actor.id;
    if ((!wordbook.isPublic || wordbook.hiddenByAdmin) && !isOwner) {
      return { ok: false as const, status: 404, error: "Not found." };
    }

    const { downloadedAt, myRating } = await this.repo.findMyDownloadAndRating(actor.id, wordbookId);
    return {
      ok: true as const,
      wordbook: {
        ...wordbook,
        isOwner,
        downloadedAt,
        myRating
      }
    };
  }

  async updateMine(actor: WordbookActor, wordbookId: number, data: UpdateWordbookInput) {
    const existing = await this.repo.findWordbookMeta(wordbookId);
    if (!existing) {
      return { ok: false as const, status: 404, error: "Not found." };
    }
    if (existing.ownerId !== actor.id) {
      return { ok: false as const, status: 403, error: "Forbidden." };
    }

    if (
      isPrivateWordbookLockedForFree({
        plan: getEffectivePlan({ plan: actor.plan, proUntil: actor.proUntil }),
        isOwner: true,
        isPublic: existing.isPublic
      })
    ) {
      return {
        ok: false as const,
        status: 403,
        error: "무료 요금제에서는 비공개 단어장을 수정할 수 없습니다. 공개 전환 또는 업그레이드가 필요합니다."
      };
    }

    const wordbook = await this.repo.updateWordbookAndBumpVersion(wordbookId, data);
    return { ok: true as const, wordbook };
  }

  async deleteMine(actor: WordbookActor, wordbookId: number) {
    const existing = await this.repo.findWordbookMeta(wordbookId);
    if (!existing) {
      return { ok: false as const, status: 404, error: "Not found." };
    }
    if (existing.ownerId !== actor.id) {
      return { ok: false as const, status: 403, error: "Forbidden." };
    }

    await this.repo.deleteWordbook(wordbookId);
    return { ok: true as const };
  }
}
