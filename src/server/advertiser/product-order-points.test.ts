import { describe, expect, it } from "vitest";
import { calculateProductOrderAmounts, clampPointsApplied } from "@/server/advertiser/product-order-points";

describe("calculateProductOrderAmounts", () => {
  it("calculates VAT and totals correctly", () => {
    const result = calculateProductOrderAmounts({
      unitPriceKrw: 1000,
      vatPercent: 10,
      totalDays: 2,
      dailyTarget: 3,
    });

    expect(result.totalQty).toBe(6);
    expect(result.budgetTotalKrw).toBe(6000);
    expect(result.vatAmountKrw).toBe(600);
    expect(result.totalAmountKrw).toBe(6600);
  });
});

describe("clampPointsApplied", () => {
  it("clamps to available balance and total amount", () => {
    const result = clampPointsApplied({
      requestedPointsKrw: 12000,
      balanceKrw: 5000,
      totalAmountKrw: 8000,
    });

    expect(result.maxPointsKrw).toBe(5000);
    expect(result.pointsAppliedKrw).toBe(5000);
  });

  it("prevents negative points", () => {
    const result = clampPointsApplied({
      requestedPointsKrw: -1000,
      balanceKrw: 5000,
      totalAmountKrw: 8000,
    });

    expect(result.pointsAppliedKrw).toBe(0);
  });
});

