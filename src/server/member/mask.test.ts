import { describe, expect, it } from "vitest";
import { maskAccountNumber } from "@/server/member/mask";

describe("maskAccountNumber", () => {
  it("masks short inputs", () => {
    expect(maskAccountNumber("123")).toBe("****");
  });

  it("keeps last4 digits", () => {
    expect(maskAccountNumber("1234-5678-9012-3456")).toBe("****-****-3456");
  });
});


