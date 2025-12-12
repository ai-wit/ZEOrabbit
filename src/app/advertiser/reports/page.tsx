import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { getAdvertiserBudgetBalanceKrw } from "@/server/advertiser/balance";
import { toDateOnlyUtc } from "@/server/date/date-only";

export default async function AdvertiserReportsPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const today = toDateOnlyUtc(new Date());
  const budgetBalance = await getAdvertiserBudgetBalanceKrw(advertiserId);

  const activeCampaigns = await prisma.campaign.findMany({
    where: { advertiserId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      missionType: true,
      dailyTarget: true,
      unitPriceKrw: true,
      rewardKrw: true,
      place: { select: { name: true } }
    }
  });

  const missionDaysToday = await prisma.missionDay.findMany({
    where: { campaignId: { in: activeCampaigns.map((c) => c.id) }, date: today },
    select: { id: true, campaignId: true, quotaTotal: true, quotaRemaining: true }
  });
  const missionDayByCampaign = new Map(missionDaysToday.map((m) => [m.campaignId, m]));

  const participationToday = await prisma.participation.findMany({
    where: {
      missionDayId: { in: missionDaysToday.map((m) => m.id) }
    },
    select: { missionDayId: true, status: true }
  });
  const statsByMissionDayId = new Map<
    string,
    { approved: number; rejected: number; pending: number; inProgress: number }
  >();
  for (const p of participationToday) {
    const s =
      statsByMissionDayId.get(p.missionDayId) ??
      { approved: 0, rejected: 0, pending: 0, inProgress: 0 };
    if (p.status === "APPROVED") s.approved += 1;
    else if (p.status === "REJECTED") s.rejected += 1;
    else if (p.status === "IN_PROGRESS") s.inProgress += 1;
    else s.pending += 1;
    statsByMissionDayId.set(p.missionDayId, s);
  }

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">리포트</h1>
        <div className="text-sm text-zinc-400">예산 잔액: {budgetBalance}원</div>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-6 py-4 text-sm text-zinc-300">
          오늘 진행 중 캠페인 {activeCampaigns.length}개
        </div>
        <div className="divide-y divide-zinc-800">
          {activeCampaigns.length === 0 ? (
            <div className="px-6 py-10 text-sm text-zinc-400">
              활성화된 캠페인이 없습니다.
            </div>
          ) : (
            activeCampaigns.map((c) => {
              const md = missionDayByCampaign.get(c.id);
              const mdStats = md ? statsByMissionDayId.get(md.id) : undefined;
              const approved = mdStats?.approved ?? 0;
              const rejected = mdStats?.rejected ?? 0;
              const pending = mdStats?.pending ?? 0;
              const inProgress = mdStats?.inProgress ?? 0;
              const spentKrw = approved * c.unitPriceKrw;
              const approvalRate =
                approved + rejected > 0 ? Math.round((approved / (approved + rejected)) * 100) : null;

              return (
                <div key={c.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {c.place.name} · {c.missionType} · 목표 {c.dailyTarget}건 · 단가 {c.unitPriceKrw}원
                      </div>
                      {md ? (
                        <div className="mt-2 text-xs text-zinc-500">
                          오늘 수량 {md.quotaRemaining}/{md.quotaTotal} · 승인 {approved} · 반려 {rejected} · 대기{" "}
                          {pending} · 진행 {inProgress}
                          {approvalRate !== null ? ` · 승인율 ${approvalRate}%` : ""}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-zinc-500">오늘 미션이 아직 생성되지 않았습니다.</div>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400">오늘 소진(승인 기준): {spentKrw}원</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/advertiser"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          광고주 홈
        </Link>
        <Link
          href="/advertiser/billing"
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          결제/충전
        </Link>
      </div>
    </main>
  );
}


