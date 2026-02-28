import { describe, expect, it } from "vitest";

import {
  clampLength,
  isUnsafeAiExample,
  normalizeTermForKey,
  normalizeWhitespace,
  sanitizeExampleInput,
  sanitizeTermInput
} from "@/lib/clipper";

describe("clipper text helpers", () => {
  it("clampLength trims only over-long values", () => {
    expect(clampLength("hello", 10)).toBe("hello");
    expect(clampLength("abcdef", 3)).toBe("abc");
  });

  it("normalizeWhitespace collapses and trims spaces", () => {
    expect(normalizeWhitespace("  hello    world\nnew\trow  ")).toBe("hello world new row");
  });

  it("normalizeTermForKey trims punctuation and lowercases", () => {
    expect(normalizeTermForKey("  Hello!  ")).toBe("hello");
    expect(normalizeTermForKey("@@@Hi!!")).toBe("hi");
  });

  it("sanitizeTermInput and sanitizeExampleInput apply max length", () => {
    expect(sanitizeTermInput("a".repeat(70))).toHaveLength(64);
    expect(sanitizeExampleInput("b".repeat(700))).toHaveLength(500);
  });

  it("isUnsafeAiExample flags malformed, oversized, or prohibited text", () => {
    expect(isUnsafeAiExample("")).toBe(true);
    expect(isUnsafeAiExample("This is safe and short")).toBe(false);
    expect(isUnsafeAiExample("visit https://example.com now")).toBe(true);
    expect(isUnsafeAiExample("contact me at a@b.com")).toBe(true);
    expect(isUnsafeAiExample("This contains fuck word")).toBe(true);
    expect(isUnsafeAiExample("a".repeat(201))).toBe(true);
  });
});
