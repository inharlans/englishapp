import { prisma } from "@/lib/prisma";
import { getUserFromRequestCookies } from "@/lib/authServer";
import type {
  AuthenticatedUser,
  BootstrapCreatedUser,
  LoginUser
} from "@/server/domain/auth/contracts";

export class AuthRepository {
  async findLoginUserByEmail(email: string): Promise<LoginUser | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true }
    });
    return user ?? null;
  }

  async getAuthenticatedUserFromCookies(cookies: {
    get(name: string): { value: string } | undefined;
  }): Promise<AuthenticatedUser | null> {
    return getUserFromRequestCookies(cookies);
  }

  async bootstrapAdminUser(params: {
    email: string;
    passwordHash: string;
  }): Promise<BootstrapCreatedUser | null> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(946824611::bigint)");
      const existingCount = await tx.user.count();
      if (existingCount > 0) return null;

      return tx.user.create({
        data: { email: params.email, passwordHash: params.passwordHash, isAdmin: true, plan: "PRO", proUntil: null },
        select: { id: true, email: true }
      });
    });
  }
}

