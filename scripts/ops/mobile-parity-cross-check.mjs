import { spawnSync } from "node:child_process";

const STEPS = [
  {
    label: "Web change -> mobile parity validation",
    command: "npm",
    args: ["run", "ops:mobile-parity:backend-check"]
  },
  {
    label: "Mobile change -> shared web route validation",
    command: "npx",
    args: [
      "vitest",
      "run",
      "app/api/wordbooks/[id]/study/items/[itemId]/route.test.ts",
      "app/api/wordbooks/[id]/quiz/submit/route.test.ts",
      "app/api/users/me/study-preferences/route.test.ts",
      "lib/api/mobileParity.test.ts"
    ]
  }
];

for (const step of STEPS) {
  console.log(`\n[mobile-parity-cross-check] ${step.label}`);
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\n[mobile-parity-cross-check] all checks passed");
