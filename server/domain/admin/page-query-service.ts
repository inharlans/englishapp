import { maskEmailAddress } from "@/lib/textQuality";
import { AdminRepository } from "@/server/domain/admin/repository";

export class AdminPageQueryService {
  constructor(private readonly repo = new AdminRepository()) {}

  async listUsersForPage() {
    const users = await this.repo.findUsersForAdmin();
    return users.map((user) => ({
      ...user,
      email: maskEmailAddress(user.email),
      proUntil: user.proUntil ? user.proUntil.toISOString() : null,
      createdAt: user.createdAt.toISOString()
    }));
  }
}
