import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { getMemberProfileIdByUserId } from "@/server/member/member-profile";
import { getRewarderAvailableBalanceKrw, getRewarderBalanceKrw } from "@/server/member/balance";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import {
  ButtonLink,
  Callout,
  Card,
  CardBody,
  DividerList,
  EmptyState,
  Pill,
  StatCard,
  SparkBars
} from "@/app/_ui/primitives";

export default async function MemberDashboardPage() {
  const user = await requireRole("MEMBER");
  const memberId = await getMemberProfileIdByUserId(user.id);

  // 기본 데이터 조회
  const today = toDateOnlyUtc(new Date());
  const weekStart = toDateOnlyUtc(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

  const [
    balance,
    available,
    participationsTodayCount,
    missionsToday,
    activeMyParticipation,
    participationsLast7d,
    payoutsRecent
  ] = await Promise.all([
    getRewarderBalanceKrw(memberId),
    getRewarderAvailableBalanceKrw(memberId),
    prisma.participation.count({ where: { rewarderId: memberId, missionDay: { date: today } } }),
    prisma.missionDay.findMany({
      where: { date: today, status: "ACTIVE", campaign: { status: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        quotaRemaining: true,
        quotaTotal: true,
        campaign: { select: { missionType: true, rewardKrw: true, place: { select: { name: true } } } }
      }
    }),
    prisma.participation.findMany({
      where: {
        rewarderId: memberId,
        status: { in: ["IN_PROGRESS", "PENDING_REVIEW", "MANUAL_REVIEW"] },
        missionDay: { date: today }
      },
      select: { id: true, missionDayId: true, status: true }
    }),
    prisma.participation.findMany({
      where: { rewarderId: memberId, missionDay: { date: { gte: weekStart, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } } },
      select: { missionDay: { select: { date: true } } } }
    ),
    prisma.payoutRequest.findMany({
      where: { rewarderId: memberId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, amountKrw: true, status: true, createdAt: true }
    })
  ]);

  const myByMissionDayId = new Map(activeMyParticipation.map((p) => [p.missionDayId, p]));
  const participatedDays7d = new Set(participationsLast7d.map((r) => r.missionDay.date.toISOString().slice(0, 10))).size;

  function formatNumber(n: number): string {
    return new Intl.NumberFormat("ko-KR").format(n);
  }

  function formatKrw(n: number): string {
    return `${formatNumber(n)}원`;
  }

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="멤버"
          title="대시보드"
          description={`${user.email ?? user.id}`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/member/missions" variant="secondary" size="sm">
                오늘의 미션
              </ButtonLink>
              <ButtonLink href="/member/participations" variant="secondary" size="sm">
                내 참여 내역
              </ButtonLink>
              <ButtonLink href="/member/payouts" variant="secondary" size="sm">
                출금/정산
              </ButtonLink>
              <ButtonLink href="/" variant="secondary" size="sm">
                홈
              </ButtonLink>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-red-600 text-white hover:bg-red-700 h-8 px-3 py-1"
                >
                  로그아웃
                </button>
              </form>
            </div>
          }
        />
      }
    >
      <div className="space-y-6">
        {participationsTodayCount > 0 ? (
          <Callout tone="info" title="좋아요! 오늘도 참여 중">
            오늘 참여 <span className="font-semibold">{formatNumber(participationsTodayCount)}</span>건
          </Callout>
        ) : (
          <Callout tone="warning" title="오늘 미션을 놓치지 마세요">
            오늘 미션에 참여하면 리워드를 얻을 수 있어요.
          </Callout>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="출금 가능액"
            value={formatKrw(available)}
            hint={`총 잔액 ${formatKrw(balance)}`}
            right={<Pill tone={available >= 1000 ? "emerald" : "neutral"}>BALANCE</Pill>}
          />
          <StatCard
            title="이번 주 참여"
            value={`${formatNumber(participatedDays7d)}일`}
            hint={`최근 7일 참여 수 ${formatNumber(participationsLast7d.length)}건`}
            right={<Pill tone="cyan">HABIT</Pill>}
          />
          <StatCard
            title="오늘의 미션"
            value={formatNumber(missionsToday.length)}
            hint="가능한 미션에서 슬롯을 확보하세요"
            right={<Pill tone="indigo">TODAY</Pill>}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-50">오늘의 미션</div>
                <div className="text-xs text-zinc-400">남은 수량이 있는 미션에서 슬롯을 확보하세요</div>
              </div>
              <ButtonLink href="/member/missions" variant="secondary" size="sm">
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
                            리워드 {formatKrw(m.campaign.rewardKrw)} · 남은 수량 {formatNumber(m.quotaRemaining)} / {formatNumber(m.quotaTotal)}
                          </div>
                        </div>
                        {mine ? (
                          <ButtonLink href={`/member/participations/${mine.id}`} variant="secondary" size="sm">
                            내 진행 중
                          </ButtonLink>
                        ) : (
                          <ButtonLink href="/member/missions" variant="secondary" size="sm">
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
                <div className="text-sm font-semibold text-zinc-50">최근 출금 요청</div>
                <div className="text-xs text-zinc-400">출금 신청 상태를 확인하세요</div>
              </div>
              <ButtonLink href="/member/payouts" variant="secondary" size="sm">
                출금/정산
              </ButtonLink>
            </CardBody>
            <DividerList>
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
                      </div>
                      <div className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString("ko-KR")}</div>
                    </div>
                  </div>
                ))
              )}
            </DividerList>
          </Card>
        </div>

        <div className="text-center text-zinc-400">
          <p>🚧 REWARDER 대시보드의 모든 기능을 MEMBER 대시보드로 점진적으로 복구하는 중입니다.</p>
          <p>기본 기능부터 정상 작동하며, 추가 기능들은 순차적으로 복구될 예정입니다.</p>
        </div>
      </div>
    </PageShell>
  );
}


