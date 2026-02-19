import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BROKEN_ONLY_RE = /^[?\uFFFD\s]+$/;

function isBrokenUserText(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return false;
  if (BROKEN_ONLY_RE.test(normalized)) return true;
  if (normalized.includes("\uFFFD")) return true;
  const stripped = normalized.replace(/[\s()[\]{}<>"'`~!@#$%^&*_=+|\\/:;.,-]/g, "");
  if (!stripped) return false;
  if (/^[?\uFFFD]+$/.test(stripped)) return true;
  const hasMeaningfulChars = /[A-Za-z0-9\u3131-\u318E\uAC00-\uD7A3]/.test(normalized);
  if (!hasMeaningfulChars && /[?\uFFFD]/.test(normalized)) return true;
  return false;
}

async function main() {
  const wordbooks = await prisma.wordbook.findMany({
    where: { description: { not: null } },
    select: { id: true, description: true }
  });

  const brokenIds = wordbooks
    .filter((wb) => isBrokenUserText(wb.description))
    .map((wb) => wb.id);

  if (brokenIds.length === 0) {
    console.log("[cleanup] no broken descriptions found");
    return;
  }

  const updated = await prisma.wordbook.updateMany({
    where: { id: { in: brokenIds } },
    data: { description: null }
  });

  console.log(`[cleanup] cleared descriptions: ${updated.count}`);
}

main()
  .catch((error) => {
    console.error("[cleanup] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
