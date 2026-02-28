import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const extensionDir = path.join(rootDir, "extension");
const outputDir = path.join(rootDir, "dist", "extension");

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date) {
  const year = Math.max(1980, date.getUTCFullYear());
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = Math.floor(date.getUTCSeconds() / 2);
  return {
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
    dosTime: (hour << 11) | (minute << 5) | second
  };
}

function makeLocalHeader(name, bytes, mtime, checksum) {
  const nameBuf = Buffer.from(name, "utf8");
  const { dosDate, dosTime } = toDosDateTime(mtime);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(dosTime, 10);
  header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(bytes.length, 18);
  header.writeUInt32LE(bytes.length, 22);
  header.writeUInt16LE(nameBuf.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, nameBuf]);
}

function makeCentralHeader(name, bytes, mtime, checksum, offset) {
  const nameBuf = Buffer.from(name, "utf8");
  const { dosDate, dosTime } = toDosDateTime(mtime);
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(dosTime, 12);
  header.writeUInt16LE(dosDate, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(bytes.length, 20);
  header.writeUInt32LE(bytes.length, 24);
  header.writeUInt16LE(nameBuf.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, nameBuf]);
}

function makeEocd(entryCount, centralLen, centralOffset) {
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entryCount, 8);
  eocd.writeUInt16LE(entryCount, 10);
  eocd.writeUInt32LE(centralLen, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return eocd;
}

function normalizePath(input) {
  return String(input || "").replaceAll("\\", "/").replace(/^\.\//, "").trim();
}

function hasParentTraversal(relPath) {
  return relPath === ".." || relPath.startsWith("../") || relPath.includes("/../") || relPath.endsWith("/..");
}

function addAllowed(set, input) {
  const relPath = normalizePath(input);
  if (!relPath) return;
  if (path.isAbsolute(relPath) || /^[a-zA-Z]:\//.test(relPath) || relPath.startsWith("/") || hasParentTraversal(relPath)) {
    throw new Error(`Unsafe extension asset path: ${input}`);
  }
  set.add(relPath);
}

function globToRegExp(glob) {
  const escaped = glob
    .replaceAll("\\", "/")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DOUBLE_STAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLE_STAR::/g, ".*");
  return new RegExp(`^${escaped}$`);
}

async function listExtensionFiles() {
  const files = [];
  const denyNames = new Set(["Thumbs.db", ".DS_Store"]);

  async function walk(absDir, relDir = "") {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (denyNames.has(entry.name)) continue;
      const absPath = path.join(absDir, entry.name);
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(absPath, relPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (entry.name.endsWith(".zip")) continue;
      files.push({ relPath, absPath });
    }
  }

  await walk(extensionDir);
  return files.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

function resolveRelativeAsset(basePath, assetPath) {
  const normalized = normalizePath(assetPath);
  if (!normalized) return "";
  if (normalized.startsWith("#")) return "";
  if (/^(?:https?:|data:|chrome:|moz-extension:|mailto:|javascript:)/i.test(normalized)) return "";
  const withoutQuery = normalized.split("#")[0].split("?")[0];
  if (!withoutQuery) return "";
  if (/^[a-zA-Z]:\//.test(withoutQuery)) return "";
  if (withoutQuery.startsWith("/")) {
    const rooted = withoutQuery.replace(/^\/+/, "");
    if (!rooted || rooted.includes("/../") || rooted.startsWith("../") || rooted.endsWith("/..")) return "";
    return rooted;
  }
  const baseDir = path.posix.dirname(basePath);
  const joined = path.posix.normalize(path.posix.join(baseDir, withoutQuery));
  if (joined.startsWith("../") || joined.includes("/../")) return "";
  return joined;
}

async function collectExtensionFiles() {
  const manifestRaw = await fs.readFile(path.join(extensionDir, "manifest.json"), "utf8");
  const manifest = JSON.parse(manifestRaw);
  const allFiles = await listExtensionFiles();
  const allFileSet = new Set(allFiles.map((file) => file.relPath));

  const requiredPaths = new Set(["manifest.json"]);
  const allowList = new Set(["manifest.json"]);
  addAllowed(requiredPaths, manifest.background?.service_worker);
  addAllowed(requiredPaths, manifest.options_page);
  addAllowed(allowList, manifest.background?.service_worker);
  addAllowed(allowList, manifest.options_page);
  for (const script of manifest.content_scripts ?? []) {
    for (const js of script.js ?? []) {
      addAllowed(requiredPaths, js);
      addAllowed(allowList, js);
    }
    for (const css of script.css ?? []) {
      addAllowed(requiredPaths, css);
      addAllowed(allowList, css);
    }
  }

  addAllowed(requiredPaths, manifest.action?.default_popup);
  addAllowed(requiredPaths, manifest.side_panel?.default_path);
  addAllowed(allowList, manifest.action?.default_popup);
  addAllowed(allowList, manifest.side_panel?.default_path);

  const defaultIcon = manifest.action?.default_icon;
  if (typeof defaultIcon === "string") {
    addAllowed(requiredPaths, defaultIcon);
    addAllowed(allowList, defaultIcon);
  }
  if (defaultIcon && typeof defaultIcon === "object") {
    for (const iconPath of Object.values(defaultIcon)) {
      addAllowed(requiredPaths, iconPath);
      addAllowed(allowList, iconPath);
    }
  }

  for (const iconPath of Object.values(manifest.icons ?? {})) {
    addAllowed(requiredPaths, iconPath);
    addAllowed(allowList, iconPath);
  }

  for (const war of manifest.web_accessible_resources ?? []) {
    for (const resourcePath of war.resources ?? []) {
      const normalized = normalizePath(resourcePath);
      if (!normalized) continue;
      if (normalized.includes("*")) {
        const regex = globToRegExp(normalized);
        for (const file of allFiles) {
          if (regex.test(file.relPath)) addAllowed(allowList, file.relPath);
        }
        continue;
      }
      addAllowed(allowList, normalized);
    }
  }

  const htmlQueue = [...allowList].filter((file) => file.endsWith(".html"));
  const visitedHtml = new Set();
  const cssFromHtml = [];
  while (htmlQueue.length > 0) {
    const relHtml = htmlQueue.shift();
    if (!relHtml || visitedHtml.has(relHtml)) continue;
    visitedHtml.add(relHtml);
    if (!allFileSet.has(relHtml)) continue;
    const htmlText = await fs.readFile(path.join(extensionDir, relHtml), "utf8");
    const directDeps = [
      ...htmlText.matchAll(/<script[^>]+src=["']([^"']+)["']/gi),
      ...htmlText.matchAll(/<link[^>]+href=["']([^"']+)["']/gi),
      ...htmlText.matchAll(/<(?:img|audio|video|source|track)[^>]+(?:src|poster)=["']([^"']+)["']/gi)
    ].map((match) => resolveRelativeAsset(relHtml, match[1]));

    const srcsetDeps = [...htmlText.matchAll(/srcset=["']([^"']+)["']/gi)]
      .flatMap((match) => match[1].split(",").map((entry) => entry.trim().split(/\s+/)[0]))
      .map((candidate) => resolveRelativeAsset(relHtml, candidate));

    for (const dep of [...directDeps, ...srcsetDeps]) {
      if (!dep || !allFileSet.has(dep)) continue;
      const before = allowList.size;
      addAllowed(allowList, dep);
      if (allowList.size !== before && dep.endsWith(".html")) htmlQueue.push(dep);
      if (allowList.size !== before && dep.endsWith(".css")) cssFromHtml.push(dep);
    }
  }

  const cssQueue = [
    ...new Set([
      ...cssFromHtml,
      ...Array.from(allowList).filter((file) => file.endsWith(".css"))
    ])
  ];
  const visitedCss = new Set();
  const cssUrlPattern = /url\((['"]?)([^'")]+)\1\)/g;
  const cssImportPattern = /@import\s+(?:url\(\s*)?['"]([^'")]+)['"]\s*\)?/g;
  while (cssQueue.length > 0) {
    const relCss = cssQueue.shift();
    if (!relCss || visitedCss.has(relCss)) continue;
    visitedCss.add(relCss);
    if (!allFileSet.has(relCss)) continue;
    const cssText = await fs.readFile(path.join(extensionDir, relCss), "utf8");
    for (const match of cssText.matchAll(cssImportPattern)) {
      const dep = resolveRelativeAsset(relCss, match[1]);
      if (!dep || !allFileSet.has(dep) || !dep.endsWith(".css")) continue;
      const before = allowList.size;
      addAllowed(allowList, dep);
      if (allowList.size !== before) cssQueue.push(dep);
    }
    for (const match of cssText.matchAll(cssUrlPattern)) {
      const dep = resolveRelativeAsset(relCss, match[2]);
      if (!dep || !allFileSet.has(dep)) continue;
      addAllowed(allowList, dep);
    }
  }

  const moduleQueue = [...allowList].filter((file) => file.endsWith(".js") || file.endsWith(".mjs"));
  const visitedModule = new Set();
  const importPattern = /(?:import\s+["']([^"']+)["']|import\s+[^"']*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\))/g;
  while (moduleQueue.length > 0) {
    const relModule = moduleQueue.shift();
    if (!relModule || visitedModule.has(relModule)) continue;
    visitedModule.add(relModule);
    if (!allFileSet.has(relModule)) continue;
    const code = await fs.readFile(path.join(extensionDir, relModule), "utf8");
    for (const match of code.matchAll(importPattern)) {
      const depRaw = match[1] || match[2] || match[3] || match[4];
      const dep = resolveRelativeAsset(relModule, depRaw);
      if (!dep) continue;
      const tryPaths = [dep, `${dep}.js`, `${dep}.mjs`];
      for (const candidate of tryPaths) {
        if (!allFileSet.has(candidate)) continue;
        const before = allowList.size;
        addAllowed(allowList, candidate);
        if (allowList.size !== before && (candidate.endsWith(".js") || candidate.endsWith(".mjs"))) {
          moduleQueue.push(candidate);
        }
        break;
      }
    }
  }

  const sensitivePattern = /\.(?:pem|key|p12|env)$/i;
  const extras = allFiles.map((f) => f.relPath).filter((name) => !allowList.has(name));
  const sensitiveExtra = extras.find((name) => sensitivePattern.test(name));
  if (sensitiveExtra) throw new Error(`Sensitive-looking file is not allowed in extension package: ${sensitiveExtra}`);
  if (extras.length > 0) {
    throw new Error(`Unexpected extension files not in allowlist: ${extras.join(", ")}`);
  }

  const files = await Promise.all(
    Array.from(allowList)
      .sort((a, b) => a.localeCompare(b))
      .map(async (relPath) => {
        const absPath = path.join(extensionDir, relPath);
        const [bytes, stat] = await Promise.all([fs.readFile(absPath), fs.stat(absPath)]);
        return { name: relPath, bytes, mtime: stat.mtime };
      })
  );

  const fileSet = new Set(allFiles.map((file) => file.relPath));
  const missingRequired = Array.from(requiredPaths).filter((name) => !fileSet.has(name));
  if (missingRequired.length > 0) {
    throw new Error(`Missing required extension files: ${missingRequired.join(", ")}`);
  }

  const version = String(manifest.version || "unknown").trim() || "unknown";
  return { files, version };
}

function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const file of files) {
    const checksum = crc32(file.bytes);
    const local = makeLocalHeader(file.name, file.bytes, file.mtime, checksum);
    localParts.push(local, file.bytes);
    centralParts.push(makeCentralHeader(file.name, file.bytes, file.mtime, checksum, localOffset));
    localOffset += local.length + file.bytes.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = makeEocd(files.length, centralDir.length, localOffset);
  return Buffer.concat([...localParts, centralDir, eocd]);
}

async function main() {
  const { files, version } = await collectExtensionFiles();
  const zip = buildZip(files);
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `englishapp-pdf-clipper-v${version}.zip`);
  await fs.writeFile(outputPath, zip);
  console.log(`[extension:zip] created ${outputPath}`);
}

main().catch((error) => {
  console.error("[extension:zip] failed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
