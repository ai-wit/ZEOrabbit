import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  DividerList,
  EmptyState,
  KeyValueRow,
  Pill,
  SparkBars
} from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";
import { notFound } from "next/navigation";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatKrw(n: number): string {
  return `${formatNumber(n)}원`;
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

function dateKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function CampaignDetailPage(props: {
  params: { id: string };
}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: props.params.id },
    include: {
      advertiser: {
        include: {
          user: { select: { name: true, email: true } }
        }
      },
      place: { select: { name: true } },
      missionDays: {
        include: {
          _count: {
            select: { participations: true }
          }
        },
        orderBy: { date: "asc" }
      },
      _count: {
        select: { missionDays: true }
      }
    }
  });

  if (!campaign) {
    notFound();
  }

  // 최근 7일 참여 추이 계산
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentParticipations = await prisma.participation.findMany({
    where: {
      missionDay: {
        campaignId: campaign.id,
        date: {
          gte: weekAgo,
          lte: today
        }
      },
      status: { in: ["APPROVED", "PENDING_REVIEW", "MANUAL_REVIEW"] }
    },
    select: {
      createdAt: true,
      status: true
    }
  });

  const participationByDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dateKeyUtc(date);
    participationByDay.set(key, 0);
  }

  for (const participation of recentParticipations) {
    const key = dateKeyUtc(participation.createdAt);
    participationByDay.set(key, (participationByDay.get(key) ?? 0) + 1);
  }

  const participationSeries = Array.from(participationByDay.values()).reverse();

  // 총 참여자 수 계산
  const totalParticipations = await prisma.participation.count({
    where: {
      missionDay: {
        campaignId: campaign.id
      },
      status: { in: ["APPROVED", "PENDING_REVIEW", "MANUAL_REVIEW"] }
    }
  });

  // 승인된 참여자 수 계산
  const approvedParticipations = await prisma.participation.count({
    where: {
      missionDay: {
        campaignId: campaign.id
      },
      status: "APPROVED"
    }
  });

  return (
    <PageShell
      header={
        <AdminHeader
          title={`${campaign.place.name} 캠페인`}
          description={`${campaign.name} - ${campaign.advertiser.user.name ?? campaign.advertiser.user.email} 광고주`}
        />
      }
    >
      <div className="space-y-6">
        {/* 캠페인 기본 정보 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-50">{campaign.name}</div>
                <div className="text-xs text-zinc-400">
                  광고주: {campaign.advertiser.user.name ?? campaign.advertiser.user.email}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={
                  campaign.status === "ACTIVE" ? "emerald" :
                  campaign.status === "DRAFT" ? "cyan" :
                  campaign.status === "PAUSED" ? "yellow" : "neutral"
                }>
                  {campaign.status === "ACTIVE" ? "활성" :
                   campaign.status === "DRAFT" ? "초안" :
                   campaign.status === "PAUSED" ? "일시정지" : "종료"}
                </Pill>
                <Pill tone="neutral">{campaign.missionType}</Pill>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KeyValueRow k="장소" v={campaign.place.name} />
              <KeyValueRow k="미션 타입" v={campaign.missionType} />
              <KeyValueRow k="일일 목표" v={`${formatNumber(campaign.dailyTarget)}명`} />
              <KeyValueRow k="단가" v={formatKrw(campaign.unitPriceKrw)} />
              <KeyValueRow k="보상" v={formatKrw(campaign.rewardKrw)} />
              <KeyValueRow k="총 예산" v={formatKrw(campaign.budgetTotalKrw)} />
              <KeyValueRow k="캠페인 기간" v={`${formatDate(campaign.startDate)} ~ ${formatDate(campaign.endDate)}`} />
              <KeyValueRow k="미션 일수" v={`${formatNumber(campaign._count.missionDays)}일`} />
              <KeyValueRow k="생성일" v={formatDateTime(campaign.createdAt)} />
            </div>

            {/* 참여 현황 요약 */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-xs font-semibold text-zinc-300">총 참여</div>
                <div className="mt-2 text-sm font-semibold text-zinc-50">
                  {formatNumber(totalParticipations)}명
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-xs font-semibold text-zinc-300">승인 완료</div>
                <div className="mt-2 text-sm font-semibold text-emerald-100">
                  {formatNumber(approvedParticipations)}명
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-xs font-semibold text-zinc-300">최근 7일 추이</div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-50">
                    {formatNumber(participationSeries.reduce((a, b) => a + b, 0))}명
                  </div>
                  <SparkBars values={participationSeries} tone="cyan" ariaLabel="최근 7일 참여 추이" />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 미션 일자별 현황 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              미션 일자별 현황 ({formatNumber(campaign.missionDays.length)}일)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {campaign.missionDays.length === 0 ? (
                  <EmptyState title="미션 일자가 없습니다." />
                ) : (
                  campaign.missionDays.map((missionDay) => (
                    <div key={missionDay.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {formatDate(missionDay.date)}
                            </div>
                            <Pill tone={
                              missionDay.status === "ACTIVE" ? "emerald" :
                              missionDay.status === "PAUSED" ? "yellow" : "neutral"
                            }>
                              {missionDay.status === "ACTIVE" ? "활성" :
                               missionDay.status === "PAUSED" ? "일시정지" : "종료"}
                            </Pill>
                          </div>
                          <div className="text-xs text-zinc-500">
                            목표 수량: {formatNumber(missionDay.quotaTotal)} · 잔여: {formatNumber(missionDay.quotaRemaining)}
                            · 참여: {formatNumber(missionDay._count.participations)}명
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </DividerList>
            </div>
          </CardBody>
        </Card>

        {/* 액션 버튼들 */}
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/admin/campaigns" variant="secondary" size="sm">
            목록으로 돌아가기
          </ButtonLink>
          <ButtonLink href={`/admin/reviews?campaignId=${campaign.id}`} variant="secondary" size="sm">
            검수 대기 보기
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
