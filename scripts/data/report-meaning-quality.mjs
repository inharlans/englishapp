/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [totalItems, totalWords, questionItems, questionWords, slangItems] = await Promise.all([
    prisma.wordbookItem.count(),
    prisma.word.count(),
    prisma.wordbookItem.count({ where: { meaning: { contains: "(?)" } } }),
    prisma.word.count({ where: { ko: { contains: "(?)" } } }),
    prisma.wordbookItem.count({
      where: {
        OR: [
          { meaning: { contains: "ㄹㅇ" } },
          { meaning: { contains: "레알" } },
          { meaning: { contains: "겁나" } },
          { meaning: { contains: "ㅈㄴ" } },
          { meaning: { contains: "존나" } }
        ]
      }
    })
  ]);

  const examples = await prisma.wordbookItem.findMany({
    where: { meaning: { contains: "(?)" } },
    orderBy: { id: "asc" },
    take: 20,
    select: { id: true, term: true, meaning: true }
  });

  console.log("[report] wordbookItem total:", totalItems);
  console.log("[report] word total:", totalWords);
  console.log("[report] wordbookItem with '(?)':", questionItems);
  console.log("[report] word with '(?)':", questionWords);
  console.log("[report] wordbookItem with slang/noise:", slangItems);
  console.log("[report] '(?)' examples:");
  console.log(JSON.stringify(examples, null, 2));
}

main()
  .catch((error) => {
    console.error("[report] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

