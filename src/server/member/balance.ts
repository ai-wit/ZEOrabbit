import { prisma } from "@/server/prisma";

export async function getRewarderBalanceKrw(rewarderId: string): Promise<number> {
  const agg = await prisma.creditLedger.aggregate({
    where: { rewarderId },
    _sum: { amountKrw: true }
  });
  return agg._sum.amountKrw ?? 0;
}

export async function getRewarderAvailableBalanceKrw(rewarderId: string): Promise<number> {
  const [balanceAgg, pendingAgg] = await Promise.all([
    prisma.creditLedger.aggregate({
      where: { rewarderId },
      _sum: { amountKrw: true }
    }),
    prisma.payoutRequest.aggregate({
      where: { rewarderId, status: { in: ["REQUESTED", "APPROVED"] } },
      _sum: { amountKrw: true }
    })
  ]);

  const balance = balanceAgg._sum.amountKrw ?? 0;
  const pending = pendingAgg._sum.amountKrw ?? 0;
  return balance - pending;
}


