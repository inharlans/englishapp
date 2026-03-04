import { describe, expect, it } from "vitest";

import { normalizeTerm } from "@/lib/normalizeTerm";

describe("normalizeTerm", () => {
  it("applies lowercase, trim, and punctuation normalization", () => {
    expect(normalizeTerm(" Abandoned. ")).toBe("abandoned");
    expect(normalizeTerm("abandoned")).toBe("abandoned");
    expect(normalizeTerm("abandoned...")).toBe("abandoned");
  });

  it("normalizes unicode compatibility forms and possessive suffix", () => {
    expect(normalizeTerm("ＦＯＯ  BAR")).toBe("foo bar");
    expect(normalizeTerm("teacher's")).toBe("teachers");
    expect(normalizeTerm("teacher’s")).toBe("teachers");
    expect(normalizeTerm("teacher's.")).toBe("teachers");
    expect(normalizeTerm("it's")).toBe("its");
    expect(normalizeTerm("McDonald's")).toBe("mcdonalds");
  });

  it("keeps symbol-significant terms distinct", () => {
    expect(normalizeTerm("C++")).toBe("c++");
    expect(normalizeTerm("AT&T")).toBe("at&t");
    expect(normalizeTerm("C#")).toBe("c#");
    expect(normalizeTerm("F#")).toBe("f#");
  });
});
