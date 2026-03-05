import { z } from "zod";

import { ApiError, parseApiResponse } from "@/lib/api/base";
import { apiFetch } from "@/lib/clientApi";

const rawSessionSchema = z.object({
  id: z.union([z.string().min(1), z.number().int().nonnegative()]).transform((value) => String(value)),
  platform: z.string().min(1),
  deviceLabel: z.string().min(1),
  createdAt: z.string().min(1),
  isCurrent: z.boolean()
}).passthrough();

const sessionsEnvelopeSchema = z.object({
  sessions: z.array(rawSessionSchema)
}).passthrough();

const sessionSchema = rawSessionSchema.extend({
  platform: z.enum(["MOBILE", "WEB"])
});

const mobileSessionSchema = sessionSchema.extend({
  platform: z.literal("MOBILE")
});

const mobileSessionsSchema = z.array(mobileSessionSchema);

const revokeSessionResponseSchema = z.object({
  ok: z.boolean(),
  revokedCount: z.number().int().min(0),
  accessTokenRevoked: z.boolean().optional().default(false),
  accessTokenTtlSeconds: z.number().int().min(0).optional().default(900)
});

const clipperCandidatesResponseSchema = z.object({
  candidates: z.array(z.string())
});

const wordCaptureResponseSchema = z.object({
  ok: z.boolean(),
  savedCount: z.number().int().min(0),
  duplicateCount: z.number().int().min(0),
  failed: z.array(z.string()).optional().default([])
});

type MobileSessionsResponse = {
  sessions: MobileSession[];
};
type Session = z.infer<typeof sessionSchema>;
type MobileSession = z.infer<typeof mobileSessionSchema>;
type RevokeSessionResponse = z.infer<typeof revokeSessionResponseSchema>;
type ClipperCandidatesResponse = z.infer<typeof clipperCandidatesResponseSchema>;
type WordCaptureResponse = z.infer<typeof wordCaptureResponseSchema>;

function assertContract<T>(schema: z.ZodType<T>, value: unknown, source: string): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  throw new ApiError({
    message: "Invalid API response contract.",
    status: 500,
    source,
    code: "API_CONTRACT_INVALID"
  });
}

export async function fetchMobileSessions(): Promise<MobileSessionsResponse> {
  const res = await apiFetch("/api/auth/sessions", { method: "GET" });
  const body = await parseApiResponse<unknown>(res, "Failed to load sessions.", "mobileParity.sessions");
  const parsed = assertContract(sessionsEnvelopeSchema, body, "mobileParity.sessions");
  const knownSessions: Session[] = [];

  for (const candidate of parsed.sessions) {
    const known = sessionSchema.safeParse(candidate);
    if (known.success) {
      knownSessions.push(known.data);
      continue;
    }

    console.warn("[mobileParity.sessions] unknown platform ignored", {
      platform: candidate.platform
    });
  }

  const mobileCandidates = knownSessions.filter((session) => session.platform === "MOBILE");
  const sessions = assertContract(mobileSessionsSchema, mobileCandidates, "mobileParity.sessions");
  return { sessions };
}

export async function revokeMobileSession(sessionId: number | string): Promise<RevokeSessionResponse> {
  const encoded = encodeURIComponent(String(sessionId));
  const res = await apiFetch(`/api/auth/sessions/${encoded}`, { method: "DELETE" });
  const body = await parseApiResponse<unknown>(res, "Failed to revoke session.", "mobileParity.revokeSession");
  return assertContract(revokeSessionResponseSchema, body, "mobileParity.revokeSession");
}

export async function extractClipperCandidates(rawText: string): Promise<ClipperCandidatesResponse> {
  const res = await apiFetch("/api/clipper/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText })
  });
  const body = await parseApiResponse<unknown>(res, "Failed to extract clipper candidates.", "mobileParity.clipperCandidates");
  return assertContract(clipperCandidatesResponseSchema, body, "mobileParity.clipperCandidates");
}

export async function captureWords(selectedWords: string[]): Promise<WordCaptureResponse> {
  const res = await apiFetch("/api/word-capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedWords })
  });
  const body = await parseApiResponse<unknown>(res, "Failed to capture words.", "mobileParity.wordCapture");
  return assertContract(wordCaptureResponseSchema, body, "mobileParity.wordCapture");
}
