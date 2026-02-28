import { describe, expect, it } from "vitest";

import { createStoredZip } from "@/lib/extensionZip";

describe("createStoredZip", () => {
  it("creates a valid zip buffer signature", () => {
    const zip = createStoredZip([
      {
        name: "manifest.json",
        bytes: Buffer.from('{"manifest_version":3}', "utf8"),
        mtime: new Date("2026-03-01T00:00:00.000Z")
      },
      {
        name: "icons/icon-128.png",
        bytes: Buffer.from("png", "utf8"),
        mtime: new Date("2026-03-01T00:00:00.000Z")
      }
    ]);

    expect(zip.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(zip.includes(Buffer.from("manifest.json", "utf8"))).toBe(true);
    expect(zip.includes(Buffer.from("icons/icon-128.png", "utf8"))).toBe(true);
  });
});
