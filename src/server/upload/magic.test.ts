import { describe, expect, it } from "vitest";
import { isJpeg, isPng, isWebp } from "@/server/upload/magic";

describe("magic bytes", () => {
  it("detects png", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isPng(bytes)).toBe(true);
  });

  it("detects jpeg", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    expect(isJpeg(bytes)).toBe(true);
  });

  it("detects webp", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
    ]);
    expect(isWebp(bytes)).toBe(true);
  });
});


