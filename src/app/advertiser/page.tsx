import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { getAdvertiserBudgetBalanceKrw } from "@/server/advertiser/balance";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Callout, Card, CardBody, DividerList, EmptyState, KeyValueRow, Pill, SparkBars, StatCard } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "./_components/AdvertiserHeader";

export default async function AdvertiserPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const today = toDateOnlyUtc(new Date());
  const weekStart = toDateOnlyUtc(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  function formatNumber(n: number): string {
    return new Intl.NumberFormat("ko-KR").format(n);
  }

  function formatKrw(n: number): string {
    return `${formatNumber(n)}원`;
  }

  function dateKeyUtc(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  const [
    budgetBalance,
    placesCount,
    campaignsActive,
    campaignsDraft,
    campaignsPaused,
    campaignsEnded,
    missionDaysToday,
    quotaAggToday,
    pendingReviews,
    pendingManual,
    spendTodayAgg,
    topupTodayAgg,
    decisionsLast7d,
    spendLedgersLast7d,
    topupLedgersLast7d,
    recentCampaigns,
    recentLedgers
  ] = await Promise.all([
    getAdvertiserBudgetBalanceKrw(advertiserId),
    prisma.place.count({ where: { advertiserId } }),
    prisma.campaign.count({ where: { advertiserId, status: "ACTIVE" } }),
    prisma.campaign.count({ where: { advertiserId, status: "DRAFT" } }),
    prisma.campaign.count({ where: { advertiserId, status: "PAUSED" } }),
    prisma.campaign.count({ where: { advertiserId, status: "ENDED" } }),
    prisma.missionDay.count({
      where: { date: today, status: "ACTIVE", campaign: { status: "ACTIVE", advertiserId } }
    }),
    prisma.missionDay.aggregate({
      where: { date: today, status: "ACTIVE", campaign: { status: "ACTIVE", advertiserId } },
      _sum: { quotaTotal: true, quotaRemaining: true }
    }),
    prisma.participation.count({
      where: { status: "PENDING_REVIEW", missionDay: { campaign: { advertiserId } } }
    }),
    prisma.participation.count({
      where: { status: "MANUAL_REVIEW", missionDay: { campaign: { advertiserId } } }
    }),
    prisma.budgetLedger.aggregate({
      where: { advertiserId, reason: "MISSION_APPROVED_CHARGE", createdAt: { gte: today, lt: tomorrow } },
      _sum: { amountKrw: true }
    }),
    prisma.budgetLedger.aggregate({
      where: { advertiserId, reason: "TOPUP", createdAt: { gte: today, lt: tomorrow } },
      _sum: { amountKrw: true }
    }),
    prisma.participation.findMany({
      where: {
        decidedAt: { gte: weekStart, lt: tomorrow },
        status: { in: ["APPROVED", "REJECTED"] },
        missionDay: { campaign: { advertiserId } }
      },
      select: { decidedAt: true, status: true }
    }),
    prisma.budgetLedger.findMany({
      where: { advertiserId, reason: "MISSION_APPROVED_CHARGE", createdAt: { gte: weekStart, lt: tomorrow } },
      select: { createdAt: true, amountKrw: true }
    }),
    prisma.budgetLedger.findMany({
      where: { advertiserId, reason: "TOPUP", createdAt: { gte: weekStart, lt: tomorrow } },
      select: { createdAt: true, amountKrw: true }
    }),
    prisma.campaign.findMany({
      where: { advertiserId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        status: true,
        missionType: true,
        dailyTarget: true,
        unitPriceKrw: true,
        rewardKrw: true,
        startDate: true,
        endDate: true,
        place: { select: { name: true } }
      }
    }),
    prisma.budgetLedger.findMany({
      where: { advertiserId, reason: { in: ["TOPUP", "MISSION_APPROVED_CHARGE"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, createdAt: true, reason: true, amountKrw: true, refId: true }
    })
  ]);

  const quotaTotal = quotaAggToday._sum.quotaTotal ?? 0;
  const quotaRemaining = quotaAggToday._sum.quotaRemaining ?? 0;
  const reviewQueueTotal = pendingReviews + pendingManual;

  const spendToday = Math.abs(spendTodayAgg._sum.amountKrw ?? 0);
  const topupToday = topupTodayAgg._sum.amountKrw ?? 0;

  const days: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    days.push(toDateOnlyUtc(new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)));
  }

  const approvedByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  const rejectedByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  for (const row of decisionsLast7d) {
    if (!row.decidedAt) continue;
    const k = dateKeyUtc(toDateOnlyUtc(row.decidedAt));
    if (row.status === "APPROVED") approvedByDay.set(k, (approvedByDay.get(k) ?? 0) + 1);
    if (row.status === "REJECTED") rejectedByDay.set(k, (rejectedByDay.get(k) ?? 0) + 1);
  }

  const spendByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  for (const row of spendLedgersLast7d) {
    const k = dateKeyUtc(toDateOnlyUtc(row.createdAt));
    spendByDay.set(k, (spendByDay.get(k) ?? 0) + Math.abs(row.amountKrw));
  }

  const topupByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  for (const row of topupLedgersLast7d) {
    const k = dateKeyUtc(toDateOnlyUtc(row.createdAt));
    topupByDay.set(k, (topupByDay.get(k) ?? 0) + row.amountKrw);
  }

  const approvedSeries = days.map((d) => approvedByDay.get(dateKeyUtc(d)) ?? 0);
  const rejectedSeries = days.map((d) => rejectedByDay.get(dateKeyUtc(d)) ?? 0);
  const spendSeries = days.map((d) => spendByDay.get(dateKeyUtc(d)) ?? 0);
  const topupSeries = days.map((d) => topupByDay.get(dateKeyUtc(d)) ?? 0);

  const spendLast7d = spendSeries.reduce((a, b) => a + b, 0);
  const approvedLast7d = approvedSeries.reduce((a, b) => a + b, 0);
  const rejectedLast7d = rejectedSeries.reduce((a, b) => a + b, 0);

  const ledgerParticipationIds = recentLedgers
    .filter((l) => l.reason === "MISSION_APPROVED_CHARGE" && l.refId)
    .map((l) => l.refId as string);

  const ledgerParticipationMap = new Map<string, { placeName: string; missionType: string }>();
  if (ledgerParticipationIds.length > 0) {
    const ps = await prisma.participation.findMany({
      where: { id: { in: ledgerParticipationIds } },
      select: { id: true, missionDay: { select: { campaign: { select: { missionType: true, place: { select: { name: true } } } } } } }
    });
    for (const p of ps) {
      ledgerParticipationMap.set(p.id, { placeName: p.missionDay.campaign.place.name, missionType: p.missionDay.campaign.missionType });
    }
  }

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="광고주 대시보드"
          description={`${user.email ?? user.id} (${user.role})`}
        />
      }
    >
      <div className="space-y-6">
        {campaignsActive > 0 ? (
          <Callout tone="info" title="오늘 운영 요약">
            ACTIVE 캠페인 <span className="font-semibold">{formatNumber(campaignsActive)}</span>개 · 오늘 미션{" "}
            <span className="font-semibold">{formatNumber(missionDaysToday)}</span>개 · 검수 대기{" "}
            <span className="font-semibold">{formatNumber(reviewQueueTotal)}</span>건
          </Callout>
        ) : (
          <Callout tone="warning" title="시작하기">
            플레이스를 등록하고 캠페인을 생성(DRAFT)한 뒤 활성화하면, 일별 미션 운영이 시작됩니다.
          </Callout>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="예산"
            value={
              <Link href="/advertiser/billing" className="hover:underline underline-offset-4">
                {formatKrw(budgetBalance)}
              </Link>
            }
            hint={
              <span>
                오늘 지출 <span className="font-semibold">{formatKrw(spendToday)}</span> · 오늘 충전{" "}
                <span className="font-semibold">{formatKrw(topupToday)}</span>
              </span>
            }
            right={
              <Link href="/advertiser/billing" aria-label="예산 상세로 이동" className="hover:opacity-90">
                <Pill tone={budgetBalance <= 0 ? "red" : "indigo"}>BUDGET</Pill>
              </Link>
            }
            chart={<SparkBars values={spendSeries} tone="cyan" ariaLabel="최근 7일 지출(승인 차감) 추이" />}
          />
          <StatCard
            title="캠페인"
            value={
              <Link href="/advertiser/campaigns" className="hover:underline underline-offset-4">
                {formatNumber(campaignsActive)}
              </Link>
            }
            hint={`ACTIVE ${formatNumber(campaignsActive)} · DRAFT ${formatNumber(campaignsDraft)} · PAUSED ${formatNumber(campaignsPaused)} · ENDED ${formatNumber(campaignsEnded)}`}
            right={
              <Link href="/advertiser/campaigns" aria-label="캠페인 관리로 이동" className="hover:opacity-90">
                <Pill tone="indigo">CAMPAIGN</Pill>
              </Link>
            }
          />
          <StatCard
            title="플레이스"
            value={
              <Link href="/advertiser/places" className="hover:underline underline-offset-4">
                {formatNumber(placesCount)}
              </Link>
            }
            hint="캠페인은 플레이스 단위로 생성됩니다."
            right={
              <Link href="/advertiser/places" aria-label="플레이스 관리로 이동" className="hover:opacity-90">
                <Pill tone="cyan">PLACE</Pill>
              </Link>
            }
          />
          <StatCard
            title="오늘의 미션"
            value={
              <Link href="/advertiser/reports" className="hover:underline underline-offset-4">
                {formatNumber(missionDaysToday)}
              </Link>
            }
            hint={`총 수량 ${formatNumber(quotaTotal)} · 잔여 ${formatNumber(quotaRemaining)}`}
            right={
              <Link href="/advertiser/reports" aria-label="리포트로 이동" className="hover:opacity-90">
                <Pill tone="cyan">MISSION</Pill>
              </Link>
            }
          />
          <StatCard
            title="검수 대기"
            value={
              <Link href="/advertiser/reports" className="hover:underline underline-offset-4">
                {formatNumber(reviewQueueTotal)}
              </Link>
            }
            hint={`PENDING ${formatNumber(pendingReviews)} · MANUAL ${formatNumber(pendingManual)}`}
            right={
              <Link href="/advertiser/reports" aria-label="리포트로 이동" className="hover:opacity-90">
                <Pill tone={reviewQueueTotal > 0 ? "cyan" : "neutral"}>QUEUE</Pill>
              </Link>
            }
            chart={<SparkBars values={approvedSeries} tone="emerald" ariaLabel="최근 7일 승인 건수 추이" />}
          />
          <StatCard
            title="최근 7일 승인/반려"
            value={
              <Link href="/advertiser/reports" className="hover:underline underline-offset-4">
                {formatNumber(approvedLast7d)} / {formatNumber(rejectedLast7d)}
              </Link>
            }
            hint="승인 / 반려 (결정 시각 기준)"
            right={
              <Link href="/advertiser/reports" aria-label="리포트로 이동" className="hover:opacity-90">
                <Pill tone="emerald">7D</Pill>
              </Link>
            }
            chart={<SparkBars values={rejectedSeries} tone="red" ariaLabel="최근 7일 반려 건수 추이" />}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-zinc-50">지출/충전 추이(최근 7일)</div>
                <ButtonLink href="/advertiser/billing" variant="secondary" size="sm">
                  충전하기
                </ButtonLink>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold tracking-wide text-zinc-300">지출(승인 차감)</div>
                    <SparkBars values={spendSeries} tone="cyan" ariaLabel="최근 7일 지출 추이" />
                  </div>
                  <div className="mt-2 text-lg font-semibold text-zinc-50">{formatKrw(spendLast7d)}</div>
                  <div className="mt-2 space-y-2">
                    <KeyValueRow k="오늘" v={formatKrw(spendToday)} />
                    <KeyValueRow k="잔액" v={formatKrw(budgetBalance)} />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold tracking-wide text-zinc-300">충전(TOPUP)</div>
                    <SparkBars values={topupSeries} tone="indigo" ariaLabel="최근 7일 충전 추이" />
                  </div>
                  <div className="mt-2 text-lg font-semibold text-zinc-50">{formatKrw(topupSeries.reduce((a, b) => a + b, 0))}</div>
                  <div className="mt-2 space-y-2">
                    <KeyValueRow k="오늘" v={formatKrw(topupToday)} />
                    <KeyValueRow k="캠페인 ACTIVE" v={formatNumber(campaignsActive)} />
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-500">지출은 승인 처리 시 캠페인 단가가 예산에서 차감됩니다.</div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-zinc-50">빠른 작업</div>
                <Pill tone="neutral">SHORTCUTS</Pill>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ButtonLink href="/advertiser/places/new" variant="primary">
                  플레이스 등록
                </ButtonLink>
                <ButtonLink href="/advertiser/campaigns/new" variant="secondary">
                  캠페인 생성
                </ButtonLink>
                <ButtonLink href="/advertiser/campaigns" variant="secondary">
                  캠페인 관리
                </ButtonLink>
                <ButtonLink href="/advertiser/reports" variant="secondary">
                  리포트 보기
                </ButtonLink>
              </div>
              <div className="text-xs text-zinc-400">
                플레이스 등록 → 캠페인 생성(DRAFT) → 활성화 → 일별 미션 운영 순서로 진행합니다.
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-50">최근 캠페인</div>
                <div className="text-xs text-zinc-400">상태/기간/단가를 빠르게 확인합니다.</div>
              </div>
              <ButtonLink href="/advertiser/campaigns" variant="secondary" size="sm">
                전체 보기
              </ButtonLink>
            </CardBody>
            <DividerList>
              {recentCampaigns.length === 0 ? (
                <EmptyState
                  title="캠페인이 아직 없습니다."
                  description="플레이스를 등록한 뒤 캠페인을 생성해보세요."
                  action={
                    <ButtonLink href="/advertiser/campaigns/new" variant="primary" size="sm">
                      캠페인 생성
                    </ButtonLink>
                  }
                />
              ) : (
                recentCampaigns.map((c) => (
                  <div key={c.id} className="px-6 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-zinc-50">{c.name}</div>
                          <Pill
                            tone={
                              c.status === "ACTIVE"
                                ? "emerald"
                                : c.status === "DRAFT"
                                  ? "neutral"
                                  : c.status === "PAUSED"
                                    ? "indigo"
                                    : "neutral"
                            }
                          >
                            {c.status}
                          </Pill>
                          <Pill tone={c.missionType === "TRAFFIC" ? "cyan" : c.missionType === "SAVE" ? "indigo" : "emerald"}>
                            {c.missionType}
                          </Pill>
                        </div>
                        <div className="text-xs text-zinc-400">
                          {c.place.name} · 일 목표 {formatNumber(c.dailyTarget)} · 단가 {formatKrw(c.unitPriceKrw)} · 리워드{" "}
                          {formatKrw(c.rewardKrw)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {new Date(c.startDate).toLocaleDateString("ko-KR")} ~ {new Date(c.endDate).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                      <ButtonLink href="/advertiser/campaigns" variant="secondary" size="sm">
                        관리
                      </ButtonLink>
                    </div>
                  </div>
                ))
              )}
            </DividerList>
          </Card>

          <Card>
            <CardBody className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-50">최근 예산 활동</div>
                <div className="text-xs text-zinc-400">충전(TOPUP)과 승인 차감 내역을 확인합니다.</div>
              </div>
              <ButtonLink href="/advertiser/billing" variant="secondary" size="sm">
                결제/충전
              </ButtonLink>
            </CardBody>
            <DividerList>
              {recentLedgers.length === 0 ? (
                <EmptyState title="예산 활동이 아직 없습니다." />
              ) : (
                recentLedgers.map((l) => {
                  const isTopup = l.reason === "TOPUP";
                  const meta = !isTopup && l.refId ? { placeName: "참여", missionType: "MISSION" } : null;
                  return (
                    <div key={l.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {isTopup ? `+${formatKrw(l.amountKrw)}` : `-${formatKrw(Math.abs(l.amountKrw))}`}
                            </div>
                            <Pill tone={isTopup ? "indigo" : "cyan"}>{l.reason}</Pill>
                            {meta ? (
                              <Pill tone={meta.missionType === "TRAFFIC" ? "cyan" : meta.missionType === "SAVE" ? "indigo" : "emerald"}>
                                {meta.missionType}
                              </Pill>
                            ) : null}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {isTopup ? "충전" : meta ? `${meta.placeName} · 승인 차감` : "승인 차감"}
                          </div>
                          <div className="text-xs text-zinc-500">{new Date(l.createdAt).toLocaleString("ko-KR")}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </DividerList>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}


