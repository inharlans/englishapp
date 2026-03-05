import { access } from "node:fs/promises";

const REQUIRED_ROUTE_FILES = [
  "app/api/auth/sessions/route.ts",
  "app/api/auth/sessions/[sessionId]/route.ts",
  "app/api/clipper/candidates/route.ts",
  "app/api/word-capture/route.ts",
  "app/api/users/me/study-preferences/route.ts"
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const missing = [];
  for (const routeFile of REQUIRED_ROUTE_FILES) {
    const ok = await exists(routeFile);
    if (!ok) {
      missing.push(routeFile);
    }
  }

  if (missing.length > 0) {
    console.error("[mobile-known-gaps] missing compatible route files:");
    for (const routeFile of missing) {
      console.error(`- ${routeFile}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[mobile-known-gaps] ok: all compatibility routes exist");
}

main().catch((error) => {
  console.error(`[mobile-known-gaps] failed: ${error.message}`);
  process.exitCode = 1;
});
