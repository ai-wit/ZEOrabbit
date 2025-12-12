export function calculateRewardKrw(params: { unitPriceKrw: number; rewardRatio: number }): number {
  return Math.floor(params.unitPriceKrw * params.rewardRatio);
}


