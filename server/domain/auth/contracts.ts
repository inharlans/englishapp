export type AuthPlanCode = "FREE" | "PRO";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginUser {
  id: number;
  email: string;
  passwordHash: string;
}

export interface LoginSuccess {
  ok: true;
  user: {
    id: number;
    email: string;
  };
  sessionToken: string;
  csrfToken: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  isAdmin: boolean;
  plan: AuthPlanCode;
  proUntil: Date | null;
  dailyGoal: number;
}

export interface MeResponsePayload {
  user: {
    id: number;
    email: string;
    isAdmin: boolean;
    dailyGoal: number;
  } | null;
  plan?: {
    code: AuthPlanCode;
    raw: AuthPlanCode;
    proUntil: Date | null;
    downloadWordsUsed: number;
    freeDownloadWordLimit: number;
    freeDownloadWordsRemaining: number | null;
    priceMonthlyKrw: number;
    priceYearlyKrw: number;
  };
}

export interface BootstrapInput {
  email: string;
  password: string;
}

export interface BootstrapCreatedUser {
  id: number;
  email: string;
}

