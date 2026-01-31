type ProductOrderAmountInput = {
  unitPriceKrw: number;
  vatPercent: number;
  totalDays: number;
  dailyTarget: number;
};

export function calculateProductOrderAmounts(params: ProductOrderAmountInput) {
  const totalQty = params.totalDays * params.dailyTarget;
  const budgetTotalKrw = totalQty * params.unitPriceKrw;
  const vatAmountKrw = Math.round((budgetTotalKrw * params.vatPercent) / 100);
  const totalAmountKrw = budgetTotalKrw + vatAmountKrw;

  return { totalQty, budgetTotalKrw, vatAmountKrw, totalAmountKrw };
}

type ClampPointsInput = {
  requestedPointsKrw: number;
  balanceKrw: number;
  totalAmountKrw: number;
};

export function clampPointsApplied(params: ClampPointsInput) {
  const maxPointsKrw = Math.max(0, Math.min(params.balanceKrw, params.totalAmountKrw));
  const pointsAppliedKrw = Math.max(0, Math.min(params.requestedPointsKrw, maxPointsKrw));

  return { pointsAppliedKrw, maxPointsKrw };
}

