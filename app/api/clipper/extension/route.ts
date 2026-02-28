import path from "node:path";

import { NextResponse } from "next/server";

import { createStoredZip, loadExtensionFiles } from "@/lib/extensionZip";

export const runtime = "nodejs";

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

export async function GET() {
  try {
    const extensionDir = path.join(process.cwd(), "extension");
    const files = await loadExtensionFiles(extensionDir);
    const manifest = resolveManifest(files);
    const fileNameSet = new Set(files.map((file) => file.name));
    const missingRequired = manifest.requiredPaths.filter((name) => !fileNameSet.has(name));
    if (missingRequired.length > 0) {
      console.error("clipper_extension_missing_files", { missingRequired });
      return NextResponse.json({ error: "확장 필수 파일이 누락되었습니다." }, { status: 500 });
    }
    const zipBytes = createStoredZip(files);
    const zipBody = Uint8Array.from(zipBytes);
    const fileName = `englishapp-pdf-clipper-v${manifest.version}.zip`;
    return new NextResponse(zipBody, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "확장 파일을 준비하지 못했습니다." }, { status: 500 });
  }
}
