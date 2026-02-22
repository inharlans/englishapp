import { getSessionCookieName, issueSessionToken } from "@/lib/authJwt";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { hashPassword, verifyPassword } from "@/lib/password";
import { FREE_DOWNLOAD_WORD_LIMIT, getUserDownloadedWordCount } from "@/lib/planLimits";
import { isActiveProPlan } from "@/lib/userPlan";
import type {
  BootstrapInput,
  LoginInput,
  LoginSuccess,
  MeResponsePayload
} from "@/server/domain/auth/contracts";
import { AuthRepository } from "@/server/domain/auth/repository";

export class AuthService {
  constructor(private readonly repo = new AuthRepository()) {}

  async login(input: LoginInput): Promise<LoginSuccess | null> {
    const email = input.email.trim().toLowerCase();
    const user = await this.repo.findLoginUserByEmail(email);
    if (!user) return null;

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) return null;

    const sessionToken = await issueSessionToken({
      userId: user.id,
      email: user.email,
      ttlSeconds: 60 * 60 * 24 * 30
    });
    const csrfToken = issueCsrfToken();

    return {
      ok: true,
      user: { id: user.id, email: user.email },
      sessionToken,
      csrfToken
    };
  }

  async getMe(cookies: {
    get(name: string): { value: string } | undefined;
  }): Promise<MeResponsePayload> {
    const user = await this.repo.getAuthenticatedUserFromCookies(cookies);
    if (!user) return { user: null };

    const downloadWordsUsed = await getUserDownloadedWordCount(user.id);
    const pro = isActiveProPlan({ plan: user.plan, proUntil: user.proUntil });

    return {
      user: { id: user.id, email: user.email, isAdmin: user.isAdmin, dailyGoal: user.dailyGoal },
      plan: {
        code: pro ? "PRO" : "FREE",
        raw: user.plan,
        proUntil: user.proUntil,
        downloadWordsUsed,
        freeDownloadWordLimit: FREE_DOWNLOAD_WORD_LIMIT,
        freeDownloadWordsRemaining: pro ? null : Math.max(0, FREE_DOWNLOAD_WORD_LIMIT - downloadWordsUsed),
        priceMonthlyKrw: 2900,
        priceYearlyKrw: 29000
      }
    };
  }

  async bootstrap(input: BootstrapInput): Promise<{ ok: true; user: { id: number; email: string } } | null> {
    const passwordHash = await hashPassword(input.password);
    const user = await this.repo.bootstrapAdminUser({
      email: input.email.trim().toLowerCase(),
      passwordHash
    });
    if (!user) return null;
    return { ok: true, user };
  }

  getCookieNames() {
    return {
      sessionCookieName: getSessionCookieName(),
      csrfCookieName: getCsrfCookieName()
    };
  }
}

