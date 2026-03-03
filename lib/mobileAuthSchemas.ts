import { z } from "zod";

export const providerSchema = z.enum(["google", "naver", "kakao"]);

const pkceValueSchema = z
  .string()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9._~-]+$/);

export const mobileStartSchema = z.object({
  provider: providerSchema,
  redirectUri: z.string().min(1),
  deviceId: z.string().min(8).max(128),
  codeChallenge: pkceValueSchema,
  codeChallengeMethod: z.literal("S256").default("S256")
});

export const mobileExchangeSchema = z.object({
  provider: providerSchema,
  code: z.string().min(1),
  state: z.string().min(1),
  deviceId: z.string().min(8).max(128),
  codeVerifier: pkceValueSchema
});

export const mobileRefreshSchema = z.object({
  refreshToken: z.string().min(20).max(512),
  deviceId: z.string().min(8).max(128)
});

export type OAuthProvider = z.infer<typeof providerSchema>;
