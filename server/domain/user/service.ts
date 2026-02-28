import { UserRepository } from "@/server/domain/user/repository";

export class UserService {
  constructor(private readonly repo = new UserRepository()) {}

  async updateDailyGoal(userId: number, dailyGoal: number) {
    await this.repo.updateDailyGoal(userId, dailyGoal);
    return { ok: true as const, dailyGoal };
  }

  async listBlockedOwners(userId: number) {
    const blocks = await this.repo.listBlockedOwners(userId);
    return { ok: true as const, blocks };
  }

  async removeBlockedOwner(userId: number, ownerId: number) {
    await this.repo.removeBlockedOwner(userId, ownerId);
    return { ok: true as const };
  }
}
