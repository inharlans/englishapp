import { logJson } from "@/lib/logger";

const LEGACY_DEPRECATION_AT = "@1772323200";

export type LegacyRoutePolicy = {
  route: string;
  replacement: string;
  handling: "200+deprecation" | "307";
  deprecatedAt: string;
  keepUntil: string;
  removeAfter: string;
  fallbackDocUrl: string;
  sunsetAt: string;
};

export const LEGACY_POLICY_DOC_URL = "/legacy-policy";

export const LEGACY_ROUTE_POLICIES = {
  apiQuizSubmit: {
    route: "/api/quiz/submit",
    replacement: "/api/wordbooks/{id}/quiz/submit",
    handling: "200+deprecation",
    deprecatedAt: LEGACY_DEPRECATION_AT,
    keepUntil: "2026-06-30",
    removeAfter: "2026-09-30",
    fallbackDocUrl: "/legacy-policy#api-quiz-submit",
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT"
  },
  apiWords: {
    route: "/api/words",
    replacement: "/api/wordbooks/{id}/items",
    handling: "200+deprecation",
    deprecatedAt: LEGACY_DEPRECATION_AT,
    keepUntil: "2026-06-30",
    removeAfter: "2026-09-30",
    fallbackDocUrl: "/legacy-policy#api-words",
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT"
  },
  apiWordsById: {
    route: "/api/words/{id}",
    replacement: "/api/wordbooks/{id}/items/{itemId}",
    handling: "200+deprecation",
    deprecatedAt: LEGACY_DEPRECATION_AT,
    keepUntil: "2026-06-30",
    removeAfter: "2026-09-30",
    fallbackDocUrl: "/legacy-policy#api-words-id",
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT"
  },
  apiWordsImport: {
    route: "/api/words/import",
    replacement: "/api/wordbooks/{id}/import",
    handling: "200+deprecation",
    deprecatedAt: LEGACY_DEPRECATION_AT,
    keepUntil: "2026-06-30",
    removeAfter: "2026-09-30",
    fallbackDocUrl: "/legacy-policy#api-words-import",
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT"
  },
  pageQuizWord: {
    route: "/quiz-word",
    replacement: "/wordbooks",
    handling: "307",
    deprecatedAt: LEGACY_DEPRECATION_AT,
    keepUntil: "2026-06-30",
    removeAfter: "2026-09-30",
    fallbackDocUrl: LEGACY_POLICY_DOC_URL,
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT"
  },
  pageQuizMeaning: {
    route: "/quiz-meaning",
    replacement: "/wordbooks",
    handling: "307",
    deprecatedAt: LEGACY_DEPRECATION_AT,
    keepUntil: "2026-06-30",
    removeAfter: "2026-09-30",
    fallbackDocUrl: LEGACY_POLICY_DOC_URL,
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT"
  },
  pageListCorrect: {
    route: "/list-correct",
    replacement: "/wordbooks",
    handling: "307",
    deprecatedAt: LEGACY_DEPRECATION_AT,
    keepUntil: "2026-06-30",
    removeAfter: "2026-09-30",
    fallbackDocUrl: LEGACY_POLICY_DOC_URL,
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT"
  },
  pageListWrong: {
    route: "/list-wrong",
    replacement: "/wordbooks",
    handling: "307",
    deprecatedAt: LEGACY_DEPRECATION_AT,
    keepUntil: "2026-06-30",
    removeAfter: "2026-09-30",
    fallbackDocUrl: LEGACY_POLICY_DOC_URL,
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT"
  },
  pageListHalf: {
    route: "/list-half",
    replacement: "/wordbooks",
    handling: "307",
    deprecatedAt: LEGACY_DEPRECATION_AT,
    keepUntil: "2026-06-30",
    removeAfter: "2026-09-30",
    fallbackDocUrl: LEGACY_POLICY_DOC_URL,
    sunsetAt: "Wed, 30 Sep 2026 23:59:59 GMT"
  }
} as const;

export function withLegacyDeprecationHeaders<T extends Response>(
  response: T,
  policy: LegacyRoutePolicy,
  requestPath?: string
): T {
  response.headers.set("Deprecation", policy.deprecatedAt);
  response.headers.set("Sunset", policy.sunsetAt);
  response.headers.append("Link", `<${policy.fallbackDocUrl}>; rel=\"deprecation\"`);
  response.headers.set("X-Legacy-Route", policy.route);
  response.headers.set("X-Legacy-Replacement", policy.replacement);
  response.headers.set("X-Legacy-Handling", policy.handling);
  response.headers.set("X-Legacy-Keep-Until", policy.keepUntil);
  response.headers.set("X-Legacy-Remove-After", policy.removeAfter);
  if (requestPath && requestPath !== policy.route) {
    response.headers.set("X-Legacy-Request-Path", requestPath);
  }
  return response;
}

export function recordLegacyRouteAccess(input: {
  policy: LegacyRoutePolicy;
  method?: string;
  requestPath?: string;
  userId?: number | null;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  try {
    logJson("info", "legacy_route_access", {
      route: input.policy.route,
      requestPath: input.requestPath ?? input.policy.route,
      replacement: input.policy.replacement,
      handling: input.policy.handling,
      method: input.method,
      userId: input.userId ?? null
    });
  } catch {
    return;
  }
}
