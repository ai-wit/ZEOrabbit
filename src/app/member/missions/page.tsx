import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/member/member-profile";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";

export default async function RewarderMissionsPage() {
  const user = await requireRole("MEMBER");
  const rewarderId = await getMemberProfileIdByUserId(user.id);

  const today = toDateOnlyUtc(new Date());

  const missions = await prisma.missionDay.findMany({
    where: {
      date: today,
      status: "ACTIVE",
      campaign: { status: "ACTIVE" }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quotaRemaining: true,
      quotaTotal: true,
      campaign: {
        select: {
          id: true,
          name: true,
          missionType: true,
          rewardKrw: true,
          place: { select: { name: true } }
        }
      }
    }
  });

  const activeMyParticipation = await prisma.participation.findMany({
    where: {
      rewarderId,
      status: { in: ["IN_PROGRESS", "PENDING_REVIEW", "MANUAL_REVIEW"] },
      missionDay: { date: today }
    },
    select: { id: true, missionDayId: true, status: true }
  });
  const myByMissionDayId = new Map(activeMyParticipation.map((p) => [p.missionDayId, p]));

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="REWARDER"
          title="오늘의 미션"
          description="오늘 가능한 미션을 확인하고 슬롯을 확보하세요."
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/member" variant="secondary" size="sm">
                리워더 홈
              </ButtonLink>
              <ButtonLink href="/member/payouts" variant="secondary" size="sm">
                출금/정산
              </ButtonLink>
              <ButtonLink href="/member/participations" variant="secondary" size="sm">
                내 참여 내역
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
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">총 {missions.length}개</div>
        <DividerList>
          {missions.length === 0 ? (
            <EmptyState title="오늘 가능한 미션이 없습니다." />
          ) : (
            missions.map((m) => {
              const mine = myByMissionDayId.get(m.id);
              return (
                <div key={m.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-zinc-50">{m.campaign.place.name}</div>
                      <div className="text-xs text-zinc-400">
                        {m.campaign.name} · {m.campaign.missionType} · 리워드 {m.campaign.rewardKrw}원
                      </div>
                      <div className="text-xs text-zinc-500">
                        남은 수량 {m.quotaRemaining} / {m.quotaTotal}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {mine ? (
                        <ButtonLink href={`/member/participations/${mine.id}`} variant="secondary" size="sm">
                          내 진행 중
                        </ButtonLink>
                      ) : m.quotaRemaining > 0 ? (
                        <form action="/api/member/participations" method="post">
                          <input type="hidden" name="missionDayId" value={m.id} />
                          <Button type="submit" variant="primary" size="sm">
                            시작하기(슬롯 확보)
                          </Button>
                        </form>
                      ) : (
                        <Pill tone="neutral">수량 소진</Pill>
                      )}
                      {mine ? <Pill tone="cyan">{mine.status}</Pill> : null}
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


