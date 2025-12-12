import { prisma } from "@/server/prisma";

export async function getAdvertiserBudgetBalanceKrw(advertiserId: string): Promise<number> {
  const agg = await prisma.budgetLedger.aggregate({
    where: { advertiserId },
    _sum: { amountKrw: true }
  });
  return agg._sum.amountKrw ?? 0;
}


