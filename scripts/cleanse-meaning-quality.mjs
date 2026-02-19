/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

const POS_MAP = new Map([
  ["명", "명"],
  ["명사", "명"],
  ["noun", "명"],
  ["동", "동"],
  ["동사", "동"],
  ["verb", "동"],
  ["형", "형"],
  ["형용사", "형"],
  ["adj", "형"],
  ["adjective", "형"],
  ["부", "부"],
  ["부사", "부"],
  ["adv", "부"],
  ["adverb", "부"],
  ["대", "대"],
  ["대명사", "대"],
  ["pron", "대"],
  ["pronoun", "대"],
  ["전", "전"],
  ["전치사", "전"],
  ["prep", "전"],
  ["preposition", "전"],
  ["접", "접"],
  ["접속사", "접"],
  ["conj", "접"],
  ["conjunction", "접"],
  ["감", "감"],
  ["감탄사", "감"],
  ["interj", "감"],
  ["interjection", "감"],
  ["조", "조"],
  ["조동사", "조"],
  ["aux", "조"],
  ["auxiliary", "조"],
  ["관", "관"],
  ["관사", "관"],
  ["article", "관"],
  ["det", "관"],
  ["determiner", "관"],
  ["수", "수"],
  ["수사", "수"],
  ["num", "수"],
  ["numeral", "수"]
]);

const SLANG_RE = /(ㄹㅇ|레알|겁나|ㅈㄴ|존나)/gi;

const PRONOUNS = new Set("i,you,he,she,it,we,they,me,him,her,us,them,my,mine,your,yours,his,hers,our,ours,their,theirs,who,whom,whose,which,what,this,that,these,those,someone,somebody,anyone,anybody,everyone,everybody,nobody,none".split(","));
const PREPOSITIONS = new Set("in,on,at,to,for,from,with,by,about,into,over,under,between,through,during,before,after,of,off,as,than,against,without,within,across,behind,beyond,around,near".split(","));
const CONJUNCTIONS = new Set("and,or,but,because,if,though,although,while,when,where,since,unless,however,therefore,so,yet,nor".split(","));
const INTERJECTIONS = new Set("yes,no,oh,ah,wow,hey,hello,bye,yep,huh,uh,um,hmm".split(","));
const DETERMINERS = new Set("a,an,the,this,that,these,those,some,any,many,much,few,little,several,another,other,every,each,either,neither,both,enough,more,most,least,no".split(","));
const AUXILIARIES = new Set("can,could,may,might,must,shall,should,will,would,ought".split(","));
const BE_VERBS = new Set("be,am,is,are,was,were,been,being,do,does,did,done,doing,have,has,had".split(","));
const NUMERALS = new Set("zero,one,two,three,four,five,six,seven,eight,nine,ten,first,second,third".split(","));

function normalizeSpaces(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeTag(raw) {
  const key = String(raw ?? "").toLowerCase().replace(/\s+/g, "");
  return POS_MAP.get(key) ?? null;
}

function inferPos(term) {
  const t = String(term ?? "").trim().toLowerCase();
  if (!t) return null;
  if (PRONOUNS.has(t)) return "대";
  if (PREPOSITIONS.has(t)) return "전";
  if (CONJUNCTIONS.has(t)) return "접";
  if (INTERJECTIONS.has(t)) return "감";
  if (DETERMINERS.has(t)) return "관";
  if (AUXILIARIES.has(t)) return "조";
  if (BE_VERBS.has(t)) return "동";
  if (NUMERALS.has(t)) return "수";
  if (t.endsWith("ly")) return "부";
  if (/(tion|ment|ness|ity|ship|age|er|or)$/.test(t)) return "명";
  if (/(ous|ful|able|ible|al|ive|less|ic|ish)$/.test(t)) return "형";
  if (/(ed|en|fy|ize|ise)$/.test(t)) return "동";
  return null;
}

function dedupeCommaParts(value) {
  const parts = value
    .split(",")
    .map((v) => normalizeSpaces(v))
    .filter((v) => v && !/^[~!@#$%^&*_=+|\\/:;.\-?]+$/.test(v));
  const out = [];
  const seen = new Set();
  for (const p of parts) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out.join(", ");
}

function cleanMeaning(term, rawMeaning) {
  const before = String(rawMeaning ?? "");
  let next = normalizeSpaces(before);

  // Normalize plain POS words only when they appear as standalone section markers.
  next = next.replace(
    /^(\s*)(명사|동사|형용사|부사|대명사|전치사|접속사|감탄사|조동사|관사|수사)(\s*)/u,
    (_m, p1, p2) => `${p1}(${normalizeTag(p2) ?? p2})`
  );
  next = next.replace(
    /([,;|/]\s*)(명사|동사|형용사|부사|대명사|전치사|접속사|감탄사|조동사|관사|수사)(\s*)/gu,
    (_m, p1, p2) => `${p1}(${normalizeTag(p2) ?? p2})`
  );

  // Normalize existing tags like (noun), (명사), ...
  next = next.replace(/\(([^)]+)\)/g, (full, inner) => {
    const tag = normalizeTag(inner);
    return tag ? `(${tag})` : full;
  });

  // Remove obvious slang/noise.
  next = next.replace(SLANG_RE, "");
  next = next.replace(/\s*,\s*/g, ", ");
  next = next.replace(/\?{2,}/g, "?");
  next = normalizeSpaces(next);

  next = next.replace(/(?<=\S)\(\?\)(?=\S)/gu, ", ");

  const existingTags = Array.from(next.matchAll(/\(([명동형부대전접감조관수])\)/g)).map((m) => m[1]);
  const fallbackTag = existingTags[0] ?? inferPos(term);
  if (fallbackTag) {
    next = next.replace(/\(\?\)/g, `(${fallbackTag})`);
    if (existingTags.length === 0 && !/^\([명동형부대전접감조관수]\)/.test(next)) {
      next = `(${fallbackTag})` + next;
    }
  }

  next = dedupeCommaParts(next);
  next = next.replace(/\s*\((\?)\)\s*/g, "");
  next = normalizeSpaces(next);

  return next || before;
}

async function collectRows() {
  const items = await prisma.wordbookItem.findMany({
    select: { id: true, term: true, meaning: true }
  });
  return { items };
}

async function main() {
  const { items } = await collectRows();

  const itemUpdates = [];
  let unresolvedQuestionMarks = 0;

  for (const row of items) {
    const cleaned = cleanMeaning(row.term, row.meaning);
    if (cleaned.includes("(?)")) unresolvedQuestionMarks += 1;
    if (cleaned !== row.meaning) {
      itemUpdates.push({ id: row.id, before: row.meaning, after: cleaned });
    }
  }

  console.log(`[cleanse] dryRun=${APPLY ? "false" : "true"}`);
  console.log(`[cleanse] wordbookItems changed=${itemUpdates.length}/${items.length}`);
  console.log(`[cleanse] unresolved '(?)' after clean=${unresolvedQuestionMarks}`);

  const sample = itemUpdates.slice(0, 20).map((r) => ({
    id: r.id,
    before: r.before,
    after: r.after
  }));
  if (sample.length) {
    console.log("[cleanse] sample changes (wordbook items):");
    console.log(JSON.stringify(sample, null, 2));
  }

  if (!APPLY) return;

  for (const u of itemUpdates) {
    await prisma.wordbookItem.update({
      where: { id: u.id },
      data: { meaning: u.after }
    });
  }
  console.log(`[cleanse] applied wordbookItem updates=${itemUpdates.length}`);
}

main()
  .catch((error) => {
    console.error("[cleanse] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
