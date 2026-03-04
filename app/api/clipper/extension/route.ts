import path from "node:path";
import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/authServer";
import { createStoredZip, loadExtensionFiles } from "@/lib/extensionZip";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";

export const runtime = "nodejs";

type ExtensionArchiveCache = {
  fingerprint: string;
  etag: string;
  zipBody: Uint8Array;
  fileName: string;
};

let archiveCache: ExtensionArchiveCache | null = null;

function isCrawlerLockdownEnabled(): boolean {
  const raw = (process.env.CRAWLER_LOCKDOWN_MODE ?? "on").trim().toLowerCase();
  return raw !== "off" && raw !== "0" && raw !== "false";
}

function normalizeEtag(value: string): string {
  const trimmed = value.trim();
  const withoutWeakPrefix = trimmed.replace(/^W\//i, "");
  const match = withoutWeakPrefix.match(/^"(.*)"$/);
  return (match?.[1] ?? withoutWeakPrefix).trim();
}

function hasMatchingIfNoneMatch(ifNoneMatchHeader: string | null, responseEtag: string): boolean {
  if (!ifNoneMatchHeader) return false;
  if (ifNoneMatchHeader.trim() === "*") return true;
  const expected = normalizeEtag(responseEtag);
  const validators = ifNoneMatchHeader
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return validators.some((validator) => normalizeEtag(validator) === expected);
}

function buildArchiveFingerprint(files: Array<{ name: string; bytes: Buffer }>): string {
  const hash = createHash("sha1");
  for (const file of files) {
    hash.update(file.name);
    hash.update("\0");
    hash.update(file.bytes);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function resolveManifest(files: Array<{ name: string; bytes: Buffer }>): {
  version: string;
  requiredPaths: string[];
} {
  const normalizePath = (input: string): string => input.replaceAll("\\", "/").replace(/^\.\//, "").trim();
  const addRequiredPath = (set: Set<string>, value: string | undefined) => {
    if (!value) return;
    const normalized = normalizePath(value);
    if (!normalized) return;
    set.add(normalized);
  };

  const manifest = files.find((file) => file.name === "manifest.json");
  if (!manifest) {
    return {
      version: "unknown",
      requiredPaths: ["manifest.json"]
    };
  }
  try {
    const parsed = JSON.parse(manifest.bytes.toString("utf8")) as {
      version?: string;
      background?: { service_worker?: string };
      options_page?: string;
      content_scripts?: Array<{ js?: string[]; css?: string[] }>;
      action?: { default_icon?: string | Record<string, string> };
      icons?: Record<string, string>;
    };
    const cleaned = String(parsed.version ?? "").trim();
    const required = new Set<string>(["manifest.json"]);
    addRequiredPath(required, parsed.background?.service_worker);
    addRequiredPath(required, parsed.options_page);
    for (const script of parsed.content_scripts ?? []) {
      for (const file of script.js ?? []) addRequiredPath(required, file);
      for (const file of script.css ?? []) addRequiredPath(required, file);
    }
    if (typeof parsed.action?.default_icon === "string") {
      addRequiredPath(required, parsed.action.default_icon);
    }
    if (parsed.action?.default_icon && typeof parsed.action.default_icon === "object") {
      for (const iconPath of Object.values(parsed.action.default_icon)) addRequiredPath(required, iconPath);
    }
    for (const file of Object.values(parsed.icons ?? {})) addRequiredPath(required, file);
    return {
      version: cleaned || "unknown",
      requiredPaths: Array.from(required).sort((a, b) => a.localeCompare(b))
    };
  } catch {
    return {
      version: "unknown",
      requiredPaths: ["manifest.json"]
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (isCrawlerLockdownEnabled()) {
      if (!user) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
    }

    const ip = getClientIpFromHeaders(req.headers);
    const shouldApplyRateLimit = user !== null || ip !== "unknown";
    if (shouldApplyRateLimit) {
      const rateLimitKey = user ? `clipperExtensionGet:user:${user.id}` : `clipperExtensionGet:ip:${ip}`;
      const limit = await checkRateLimit({
        key: rateLimitKey,
        limit: 6,
        windowMs: 60 * 60 * 1000
      });
      if (!limit.ok) {
        return NextResponse.json(
          { error: "Too many requests.", code: "RATE_LIMITED" },
          { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
        );
      }
    }

    const extensionDir = path.join(process.cwd(), "extension");
    const files = await loadExtensionFiles(extensionDir);
    const fingerprint = buildArchiveFingerprint(files);
    const manifest = resolveManifest(files);
    const ifNoneMatch = req.headers.get("if-none-match");

    if (archiveCache && archiveCache.fingerprint === fingerprint) {
      if (hasMatchingIfNoneMatch(ifNoneMatch, archiveCache.etag)) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: archiveCache.etag,
            "Cache-Control": "private, max-age=3600",
            Vary: "Cookie, Authorization"
          }
        });
      }

      return new NextResponse(archiveCache.zipBody as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${archiveCache.fileName}"`,
          "Cache-Control": "private, max-age=3600",
          ETag: archiveCache.etag,
          Vary: "Cookie, Authorization"
        }
      });
    }

    const fileNameSet = new Set(files.map((file) => file.name));
    const missingRequired = manifest.requiredPaths.filter((name) => !fileNameSet.has(name));
    if (missingRequired.length > 0) {
      console.error("clipper_extension_missing_files", { missingRequired });
      return NextResponse.json({ error: "확장 필수 파일이 누락되었습니다." }, { status: 500 });
    }
    const zipBytes = createStoredZip(files);
    const zipBody = new Uint8Array(zipBytes.length);
    zipBody.set(zipBytes);
    const etag = `W/\"${createHash("sha1").update(zipBody).digest("hex")}\"`;
    if (hasMatchingIfNoneMatch(ifNoneMatch, etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=3600",
          Vary: "Cookie, Authorization"
        }
      });
    }

    const fileName = `englishapp-pdf-clipper-v${manifest.version}.zip`;
    archiveCache = {
      fingerprint,
      etag,
      zipBody,
      fileName
    };

    return new NextResponse(zipBody as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, max-age=3600",
        ETag: etag,
        Vary: "Cookie, Authorization"
      }
    });
  } catch {
    return NextResponse.json({ error: "확장 파일을 준비하지 못했습니다." }, { status: 500 });
  }
}
