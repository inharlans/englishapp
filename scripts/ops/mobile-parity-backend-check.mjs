import { spawnSync } from "node:child_process";

const STEPS = [
  {
    label: "Known gap route check",
    command: "npm",
    args: ["run", "ops:mobile-known-gaps:check"]
  },
  {
    label: "Mobile parity route tests",
    command: "npx",
    args: [
      "vitest",
      "run",
      "app/api/auth/sessions/route.test.ts",
      "app/api/auth/sessions/[sessionId]/route.test.ts",
      "app/api/clipper/candidates/route.test.ts",
      "app/api/word-capture/route.test.ts",
      "app/api/users/me/study-preferences/route.test.ts",
      "app/api/users/me/clipper-settings/route.test.ts",
      "app/api/users/me/daily-goal/route.test.ts",
      "app/api/blocked-owners/route.test.ts",
      "app/api/wordbooks/[id]/study/items/[itemId]/route.test.ts",
      "app/api/wordbooks/[id]/quiz/submit/route.test.ts",
      "lib/requestSecurity.test.ts"
    ]
  }
];

for (const step of STEPS) {
  console.log(`\n[mobile-parity-backend-check] ${step.label}`);
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\n[mobile-parity-backend-check] all checks passed");
