import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { getAdvertiserBudgetBalanceKrw } from "@/server/advertiser/balance";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";

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
    <PageShell
      header={
        <PageHeader
          eyebrow="ADVERTISER"
          title="리포트"
          description={`예산 잔액: ${budgetBalance}원`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/advertiser/places" variant="secondary" size="sm">
                플레이스
              </ButtonLink>
              <ButtonLink href="/advertiser/campaigns" variant="secondary" size="sm">
                캠페인
              </ButtonLink>
              <ButtonLink href="/advertiser/billing" variant="secondary" size="sm">
                결제/충전
              </ButtonLink>
              <ButtonLink href="/advertiser" variant="secondary" size="sm">
                광고주 홈
              </ButtonLink>
              <ButtonLink href="/" variant="secondary" size="sm">
                홈
              </ButtonLink>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="danger" size="sm">
                  로그아웃
                </Button>
              </form>
            </div>
          }
        />
      }
    >
      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">
          오늘 진행 중 캠페인 {activeCampaigns.length}개
        </div>
        <DividerList>
          {activeCampaigns.length === 0 ? (
            <EmptyState title="활성화된 캠페인이 없습니다." />
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
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-zinc-50">{c.name}</div>
                        <Pill tone="cyan">{c.missionType}</Pill>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {c.place.name} · 목표 {c.dailyTarget}건 · 단가 {c.unitPriceKrw}원 · 리워드 {c.rewardKrw}원
                      </div>
                      {md ? (
                        <div className="text-xs text-zinc-500">
                          오늘 수량 {md.quotaRemaining}/{md.quotaTotal} · 승인 {approved} · 반려 {rejected} · 대기{" "}
                          {pending} · 진행 {inProgress}
                          {approvalRate !== null ? ` · 승인율 ${approvalRate}%` : ""}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500">오늘 미션이 아직 생성되지 않았습니다.</div>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400">
                      오늘 소진(승인 기준): <span className="font-semibold text-zinc-200">{spentKrw}원</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </DividerList>
      </Card>
    </PageShell>
  );
}



