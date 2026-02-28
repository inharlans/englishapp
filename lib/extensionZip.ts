import { promises as fs } from "node:fs";
import path from "node:path";

type ExtensionFile = {
  name: string;
  bytes: Buffer;
  mtime: Date;
};

type ManifestContentScript = {
  js?: string[];
  css?: string[];
};

type ExtensionManifest = {
  background?: { service_worker?: string };
  content_scripts?: ManifestContentScript[];
  options_page?: string;
  action?: { default_icon?: string | Record<string, string> };
  icons?: Record<string, string>;
};

function resolveRelativeAsset(basePath: string, assetPath: string): string {
  const normalizedAsset = assetPath.replaceAll("\\", "/").trim();
  if (!normalizedAsset) return "";
  if (/^(?:https?:|data:|chrome:|moz-extension:)/i.test(normalizedAsset)) return "";
  const baseDir = path.posix.dirname(basePath);
  const joined = path.posix.normalize(path.posix.join(baseDir, normalizedAsset));
  if (joined.startsWith("../") || joined.includes("/../")) return "";
  return joined;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function toDosDateTime(input: Date): { date: number; time: number } {
  const year = Math.max(1980, input.getUTCFullYear());
  const month = input.getUTCMonth() + 1;
  const day = input.getUTCDate();
  const hour = input.getUTCHours();
  const minute = input.getUTCMinutes();
  const second = Math.floor(input.getUTCSeconds() / 2);
  const date = ((year - 1980) << 9) | (month << 5) | day;
  const time = (hour << 11) | (minute << 5) | second;
  return { date, time };
}

function makeLocalHeader(file: ExtensionFile, checksum: number): Buffer {
  const name = Buffer.from(file.name, "utf8");
  const { date, time } = toDosDateTime(file.mtime);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(time, 10);
  header.writeUInt16LE(date, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(file.bytes.length, 18);
  header.writeUInt32LE(file.bytes.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, name]);
}

function makeCentralHeader(file: ExtensionFile, checksum: number, offset: number): Buffer {
  const name = Buffer.from(file.name, "utf8");
  const { date, time } = toDosDateTime(file.mtime);
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(time, 12);
  header.writeUInt16LE(date, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(file.bytes.length, 20);
  header.writeUInt32LE(file.bytes.length, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, name]);
}

function makeEocd(entryCount: number, centralLength: number, centralOffset: number): Buffer {
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entryCount, 8);
  eocd.writeUInt16LE(entryCount, 10);
  eocd.writeUInt32LE(centralLength, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return eocd;
}

export async function loadExtensionFiles(baseDir: string): Promise<ExtensionFile[]> {
  const manifestPath = path.join(baseDir, "manifest.json");
  const manifestBytes = await fs.readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as ExtensionManifest;

  const allowList = new Set<string>(["manifest.json"]);

  const normalizePath = (input: string): string => input.replaceAll("\\", "/").replace(/^\.\//, "").trim();
  const addAllowed = (input: string | undefined) => {
    if (!input) return;
    const relPath = normalizePath(input);
    if (!relPath) return;
    if (relPath.startsWith("/") || relPath.includes("..")) {
      throw new Error(`Unsafe extension asset path: ${input}`);
    }
    allowList.add(relPath);
  };

  addAllowed(manifest.background?.service_worker);
  addAllowed(manifest.options_page);

  for (const script of manifest.content_scripts ?? []) {
    for (const jsPath of script.js ?? []) addAllowed(jsPath);
    for (const cssPath of script.css ?? []) addAllowed(cssPath);
  }

  const addIconField = (value: string | Record<string, string> | undefined) => {
    if (!value) return;
    if (typeof value === "string") {
      addAllowed(value);
      return;
    }
    for (const pathValue of Object.values(value)) addAllowed(pathValue);
  };

  addIconField(manifest.action?.default_icon);
  addIconField(manifest.icons);

  const optionsPage = manifest.options_page ? normalizePath(manifest.options_page) : "";
  if (optionsPage) {
    const optionsHtml = await fs.readFile(path.join(baseDir, optionsPage), "utf8");
    const scripts = [...optionsHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
    const styles = [...optionsHtml.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map((match) => match[1]);
    for (const src of [...scripts, ...styles]) {
      const resolved = resolveRelativeAsset(optionsPage, src);
      addAllowed(resolved);
    }
  }

  const htmlDepsQueue = [...allowList].filter((file) => file.endsWith(".html"));
  const seenHtml = new Set<string>();
  while (htmlDepsQueue.length > 0) {
    const relHtmlPath = htmlDepsQueue.shift();
    if (!relHtmlPath || seenHtml.has(relHtmlPath)) continue;
    seenHtml.add(relHtmlPath);
    const htmlAbsPath = path.join(baseDir, relHtmlPath);
    let htmlText = "";
    try {
      htmlText = await fs.readFile(htmlAbsPath, "utf8");
    } catch {
      continue;
    }
    const dir = path.posix.dirname(relHtmlPath);
    const depPattern = /(?:src|href)\s*=\s*["']([^"']+)["']/gu;
    for (const match of htmlText.matchAll(depPattern)) {
      const raw = (match[1] ?? "").trim();
      if (!raw || raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) continue;
      const cleaned = raw.replace(/[#?].*$/, "");
      if (!cleaned) continue;
      const joined = dir === "." ? cleaned : path.posix.join(dir, cleaned);
      const normalized = normalizePath(joined);
      const beforeSize = allowList.size;
      addAllowed(normalized);
      if (allowList.size !== beforeSize && normalized.endsWith(".html")) {
        htmlDepsQueue.push(normalized);
      }
    }
  }

  const out: ExtensionFile[] = [];
  for (const relPath of allowList) {
    const absPath = path.join(baseDir, relPath);
    const [bytes, stat] = await Promise.all([fs.readFile(absPath), fs.stat(absPath)]);
    if (!stat.isFile()) continue;
    out.push({
      name: relPath,
      bytes,
      mtime: stat.mtime
    });
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function createStoredZip(files: ExtensionFile[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const file of files) {
    const checksum = crc32(file.bytes);
    const local = makeLocalHeader(file, checksum);
    localParts.push(local, file.bytes);
    const central = makeCentralHeader(file, checksum, localOffset);
    centralParts.push(central);
    localOffset += local.length + file.bytes.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = makeEocd(files.length, centralDir.length, localOffset);
  return Buffer.concat([...localParts, centralDir, eocd]);
}
