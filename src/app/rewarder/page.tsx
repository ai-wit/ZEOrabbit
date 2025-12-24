import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { getMemberProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { getRewarderAvailableBalanceKrw, getRewarderBalanceKrw } from "@/server/rewarder/balance";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import {
  Button,
  ButtonLink,
  Callout,
  Card,
  CardBody,
  DividerList,
  EmptyState,
  KeyValueRow,
  Pill,
  SparkBars,
  StatCard
} from "@/app/_ui/primitives";

export default async function RewarderPage() {
  const user = await requireRole("MEMBER");
  const rewarderId = await getMemberProfileIdByUserId(user.id);

  const today = toDateOnlyUtc(new Date());
  const weekStart = toDateOnlyUtc(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const habitStart = toDateOnlyUtc(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));

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
    balance,
    available,
    pendingPayoutAgg,
    payoutsRecent,
    ledgersRecent,
    missionsToday,
    activeMyParticipation,
    participationsTodayCount,
    participationsLast7d,
    decidedLast7d,
    earnedLast7d,
    participationsLast14d
  ] = await Promise.all([
    getRewarderBalanceKrw(rewarderId),
    getRewarderAvailableBalanceKrw(rewarderId),
    prisma.payoutRequest.aggregate({
      where: { rewarderId, status: { in: ["REQUESTED", "APPROVED"] } },
      _count: { _all: true },
      _sum: { amountKrw: true }
    }),
    prisma.payoutRequest.findMany({
      where: { rewarderId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, amountKrw: true, status: true, createdAt: true, failureReason: true }
    }),
    prisma.creditLedger.findMany({
      where: { rewarderId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, amountKrw: true, reason: true, refId: true, createdAt: true }
    }),
    prisma.missionDay.findMany({
      where: { date: today, status: "ACTIVE", campaign: { status: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        quotaRemaining: true,
        quotaTotal: true,
        campaign: { select: { missionType: true, rewardKrw: true, place: { select: { name: true } } } }
      }
    }),
    prisma.participation.findMany({
      where: {
        rewarderId,
        status: { in: ["IN_PROGRESS", "PENDING_REVIEW", "MANUAL_REVIEW"] },
        missionDay: { date: today }
      },
      select: { id: true, missionDayId: true, status: true }
    }),
    prisma.participation.count({ where: { rewarderId, missionDay: { date: today } } }),
    prisma.participation.findMany({
      where: { rewarderId, missionDay: { date: { gte: weekStart, lt: tomorrow } } },
      select: { missionDay: { select: { date: true } } }
    }),
    prisma.participation.findMany({
      where: { rewarderId, decidedAt: { gte: weekStart, lt: tomorrow }, status: { in: ["APPROVED", "REJECTED"] } },
      select: { decidedAt: true, status: true }
    }),
    prisma.creditLedger.findMany({
      where: { rewarderId, reason: "MISSION_REWARD", createdAt: { gte: weekStart, lt: tomorrow } },
      select: { createdAt: true, amountKrw: true }
    }),
    prisma.participation.findMany({
      where: { rewarderId, missionDay: { date: { gte: habitStart, lt: tomorrow } } },
      select: { missionDay: { select: { date: true } } }
    })
  ]);

  const pendingPayoutCount = pendingPayoutAgg._count._all ?? 0;
  const pendingPayoutSum = pendingPayoutAgg._sum.amountKrw ?? 0;

  const myByMissionDayId = new Map(activeMyParticipation.map((p) => [p.missionDayId, p]));

  const days: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    days.push(toDateOnlyUtc(new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)));
  }

  const participationDaysLast7d = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  for (const row of participationsLast7d) {
    const k = dateKeyUtc(toDateOnlyUtc(row.missionDay.date));
    participationDaysLast7d.set(k, (participationDaysLast7d.get(k) ?? 0) + 1);
  }

  const approvedByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  const rejectedByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  for (const row of decidedLast7d) {
    if (!row.decidedAt) continue;
    const k = dateKeyUtc(toDateOnlyUtc(row.decidedAt));
    if (row.status === "APPROVED") approvedByDay.set(k, (approvedByDay.get(k) ?? 0) + 1);
    if (row.status === "REJECTED") rejectedByDay.set(k, (rejectedByDay.get(k) ?? 0) + 1);
  }

  const earnedByDay = new Map<string, number>(days.map((d) => [dateKeyUtc(d), 0]));
  for (const row of earnedLast7d) {
    const k = dateKeyUtc(toDateOnlyUtc(row.createdAt));
    earnedByDay.set(k, (earnedByDay.get(k) ?? 0) + row.amountKrw);
  }

  const participationSeries = days.map((d) => participationDaysLast7d.get(dateKeyUtc(d)) ?? 0);
  const approvedSeries = days.map((d) => approvedByDay.get(dateKeyUtc(d)) ?? 0);
  const rejectedSeries = days.map((d) => rejectedByDay.get(dateKeyUtc(d)) ?? 0);
  const earnedSeries = days.map((d) => earnedByDay.get(dateKeyUtc(d)) ?? 0);

  const earnedSum7d = earnedSeries.reduce((a, b) => a + b, 0);
  const participatedDays7d = new Set(participationsLast7d.map((r) => dateKeyUtc(toDateOnlyUtc(r.missionDay.date)))).size;

  const habitDates = new Set(participationsLast14d.map((r) => dateKeyUtc(toDateOnlyUtc(r.missionDay.date))));
  let streak = 0;
  for (let i = 0; i < 14; i += 1) {
    const d = toDateOnlyUtc(new Date(today.getTime() - i * 24 * 60 * 60 * 1000));
    if (habitDates.has(dateKeyUtc(d))) streak += 1;
    else break;
  }

  const ledgerParticipationIds = ledgersRecent
    .filter((l) => (l.reason === "MISSION_REWARD" || l.reason === "PAYOUT" || l.reason === "PAYOUT_REVERSAL") && l.refId)
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
        <PageHeader
          eyebrow="REWARDER"
          title="리워더 대시보드"
          description={`${user.email ?? user.id} (${user.role})`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/rewarder/missions" variant="secondary" size="sm">
                오늘의 미션
              </ButtonLink>
              <ButtonLink href="/rewarder/participations" variant="secondary" size="sm">
                내 참여 내역
              </ButtonLink>
              <ButtonLink href="/rewarder/payouts" variant="secondary" size="sm">
                출금/정산
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
      <div className="space-y-6">
        {participationsTodayCount > 0 ? (
          <Callout tone="info" title="좋아요! 오늘도 참여 중">
            오늘 참여 <span className="font-semibold">{formatNumber(participationsTodayCount)}</span>건 · 연속 참여{" "}
            <span className="font-semibold">{formatNumber(streak)}</span>일
          </Callout>
        ) : (
          <Callout tone="warning" title="오늘 미션을 놓치지 마세요">
            오늘 미션에 참여하면 연속 참여 기록을 만들 수 있어요. <span className="font-semibold">지금 슬롯을 확보</span>해보세요.
          </Callout>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="출금 가능액"
            value={formatKrw(available)}
            hint={
              <span>
                총 잔액 {formatKrw(balance)} · 처리중 {formatKrw(pendingPayoutSum)}
              </span>
            }
            right={<Pill tone={available >= 1000 ? "emerald" : "neutral"}>BALANCE</Pill>}
          />
          <StatCard
            title="이번 주 참여"
            value={`${formatNumber(participatedDays7d)}일`}
            hint={`최근 7일 참여 수 ${formatNumber(participationSeries.reduce((a, b) => a + b, 0))}건`}
            right={
              <Pill tone="cyan">HABIT</Pill>
            }
            chart={<SparkBars values={participationSeries} tone="cyan" ariaLabel="최근 7일 참여 빈도" />}
          />
          <StatCard
            title="연속 참여"
            value={`${formatNumber(streak)}일`}
            hint="하루 1회만 참여해도 기록이 유지됩니다."
            right={<Pill tone={streak >= 3 ? "emerald" : "indigo"}>STREAK</Pill>}
          />
          <StatCard
            title="오늘의 미션"
            value={formatNumber(missionsToday.length)}
            hint="가능한 미션에서 슬롯을 확보하세요."
            right={<Pill tone="indigo">TODAY</Pill>}
          />
          <StatCard
            title="최근 7일 적립"
            value={formatKrw(earnedSum7d)}
            hint={`승인 ${formatNumber(approvedSeries.reduce((a, b) => a + b, 0))} · 반려 ${formatNumber(
              rejectedSeries.reduce((a, b) => a + b, 0)
            )}`}
            right={
              <Pill tone="emerald">EARN</Pill>
            }
            chart={<SparkBars values={earnedSeries} tone="emerald" ariaLabel="최근 7일 적립 추이" />}
          />
          <StatCard
            title="출금 요청(처리중)"
            value={formatNumber(pendingPayoutCount)}
            hint="REQUESTED/APPROVED 상태 합계"
            right={<Pill tone={pendingPayoutCount > 0 ? "indigo" : "neutral"}>PAYOUT</Pill>}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-50">오늘의 미션</div>
                <div className="text-xs text-zinc-400">남은 수량이 있는 미션에서 슬롯을 확보하세요.</div>
              </div>
              <ButtonLink href="/rewarder/missions" variant="secondary" size="sm">
                전체 보기
              </ButtonLink>
            </CardBody>
            <DividerList>
              {missionsToday.length === 0 ? (
                <EmptyState title="오늘 가능한 미션이 없습니다." />
              ) : (
                missionsToday.map((m) => {
                  const mine = myByMissionDayId.get(m.id);
                  return (
                    <div key={m.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">{m.campaign.place.name}</div>
                            <Pill
                              tone={
                                m.campaign.missionType === "TRAFFIC"
                                  ? "cyan"
                                  : m.campaign.missionType === "SAVE"
                                    ? "indigo"
                                    : "emerald"
                              }
                            >
                              {m.campaign.missionType}
                            </Pill>
                            {mine ? <Pill tone="cyan">{mine.status}</Pill> : null}
                          </div>
                          <div className="text-xs text-zinc-400">
                            리워드 {formatKrw(m.campaign.rewardKrw)} · 남은 수량 {formatNumber(m.quotaRemaining)} /{" "}
                            {formatNumber(m.quotaTotal)}
                          </div>
                        </div>
                        {mine ? (
                          <ButtonLink href={`/rewarder/participations/${mine.id}`} variant="secondary" size="sm">
                            내 진행 중
                          </ButtonLink>
                        ) : (
                          <ButtonLink href="/rewarder/missions" variant="secondary" size="sm">
                            시작하기
                          </ButtonLink>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </DividerList>
          </Card>

          <Card>
            <CardBody className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-50">정산/내역</div>
                <div className="text-xs text-zinc-400">최근 적립과 출금 요청을 확인합니다.</div>
              </div>
              <ButtonLink href="/rewarder/payouts" variant="secondary" size="sm">
                출금/정산
              </ButtonLink>
            </CardBody>
            <DividerList>
              <div className="px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-50">최근 적립/원장</div>
                  <Pill tone="neutral">LEDGER</Pill>
                </div>
                <div className="mt-3 space-y-2">
                  <KeyValueRow k="총 잔액" v={formatKrw(balance)} />
                  <KeyValueRow k="출금 가능액" v={formatKrw(available)} />
                  <KeyValueRow k="처리중 출금" v={formatKrw(pendingPayoutSum)} />
                </div>
              </div>
              {ledgersRecent.length === 0 ? (
                <EmptyState title="내역이 아직 없습니다." />
              ) : (
                ledgersRecent.slice(0, 6).map((l) => {
                  const meta = l.refId ? { placeName: "참여", missionType: "MISSION" } : null;
                  const sign = l.amountKrw >= 0 ? "+" : "";
                  return (
                    <div key={l.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {sign}
                              {formatKrw(l.amountKrw)}
                            </div>
                            <Pill tone={l.amountKrw >= 0 ? "emerald" : "red"}>{l.reason}</Pill>
                            {meta ? (
                              <Pill tone={meta.missionType === "TRAFFIC" ? "cyan" : meta.missionType === "SAVE" ? "indigo" : "emerald"}>
                                {meta.missionType}
                              </Pill>
                            ) : null}
                          </div>
                          <div className="text-xs text-zinc-400">{meta ? meta.placeName : "—"}</div>
                          <div className="text-xs text-zinc-500">{new Date(l.createdAt).toLocaleString("ko-KR")}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div className="px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-50">최근 출금 요청</div>
                  <Pill tone="neutral">PAYOUT</Pill>
                </div>
              </div>
              {payoutsRecent.length === 0 ? (
                <EmptyState title="출금 신청 내역이 없습니다." />
              ) : (
                payoutsRecent.map((r) => (
                  <div key={r.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-zinc-50">{formatKrw(r.amountKrw)}</div>
                          <Pill tone={r.status === "PAID" ? "emerald" : r.status === "REJECTED" ? "red" : "cyan"}>{r.status}</Pill>
                        </div>
                        {r.failureReason ? <div className="text-xs text-zinc-400">사유: {r.failureReason}</div> : null}
                      </div>
                      <div className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString("ko-KR")}</div>
                    </div>
                  </div>
                ))
              )}
            </DividerList>
          </Card>
        </div>

        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-50">참여 습관(놓치지 않기)</div>
                <div className="text-xs text-zinc-400">매일 1회 참여만 해도 연속 참여 기록이 유지됩니다.</div>
              </div>
              <ButtonLink href="/rewarder/missions" variant="primary" size="sm">
                오늘 미션 보러가기
              </ButtonLink>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="text-xs font-semibold tracking-wide text-zinc-300">연속 참여</div>
                <div className="mt-2 text-xl font-semibold text-zinc-50">{formatNumber(streak)}일</div>
                <div className="mt-2 text-xs text-zinc-400">
                  {participationsTodayCount > 0 ? "오늘 참여 완료" : "오늘 참여하면 +1"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="text-xs font-semibold tracking-wide text-zinc-300">이번 주 목표</div>
                <div className="mt-2 text-xl font-semibold text-zinc-50">
                  {formatNumber(participatedDays7d)} / 5일
                </div>
                <div className="mt-2 text-xs text-zinc-400">주 5일 참여를 목표로 해보세요.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="text-xs font-semibold tracking-wide text-zinc-300">검증 결과(7일)</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-sm text-zinc-200">
                    승인 <span className="font-semibold">{formatNumber(approvedSeries.reduce((a, b) => a + b, 0))}</span>
                  </div>
                  <div className="text-sm text-zinc-200">
                    반려 <span className="font-semibold">{formatNumber(rejectedSeries.reduce((a, b) => a + b, 0))}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <SparkBars values={approvedSeries} tone="emerald" ariaLabel="최근 7일 승인 추이" />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}


