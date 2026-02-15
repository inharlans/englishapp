import { describe, expect, it } from "vitest";

import { normalizeEn, normalizeKo, parseWords } from "@/lib/text";

describe("normalizeEn", () => {
  it("lowercases and collapses spaces/dashes/underscores", () => {
    expect(normalizeEn("  Hello---World__Test  ")).toBe("hello world test");
    expect(normalizeEn("A   B")).toBe("a b");
  });
});

describe("normalizeKo", () => {
  it("collapses spaces", () => {
    expect(normalizeKo("  안녕   하세요 ")).toBe("안녕 하세요");
  });
});

describe("parseWords", () => {
  it("parses TSV with header en/ko and removes duplicate en", () => {
    const input = "en\tko\nhello\t안녕\nhello\t안녕하세요\nbye\t잘가\n";
    const parsed = parseWords(input);
    expect(parsed.delimiter).toBe("\t");
    expect(parsed.rows).toEqual([
      { en: "hello", ko: "안녕" },
      { en: "bye", ko: "잘가" }
    ]);
  });

  it("parses CSV when TSV header not found", () => {
    const input = "en,ko\nhello,안녕\n";
    const parsed = parseWords(input);
    expect(parsed.delimiter).toBe(",");
    expect(parsed.rows).toEqual([{ en: "hello", ko: "안녕" }]);
  });

  it("throws if header is missing", () => {
    expect(() => parseWords("foo\tbar\nx\ty\n")).toThrow(/en\/ko/);
  });
});

