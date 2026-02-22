import { WordbookRepository } from "@/server/domain/wordbook/repository";

export class WordbookModerationService {
  constructor(private readonly repo = new WordbookRepository()) {}

  async blockOwner(params: {
    actorId: number;
    wordbookId: number;
  }) {
    const wb = await this.repo.findWordbookPublicVisibilityMeta(params.wordbookId);
    if (!wb || !wb.isPublic) {
      return { ok: false as const, status: 404, error: "Not found." };
    }
    if (wb.ownerId === params.actorId) {
      return { ok: false as const, status: 400, error: "Cannot block yourself." };
    }

    await this.repo.upsertBlockedOwner(params.actorId, wb.ownerId);
    return { ok: true as const };
  }
}

