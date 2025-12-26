import { prisma } from "@/server/prisma";
import { PageShell } from "@/app/_ui/shell";
import {
  ButtonLink,
  Card,
  CardBody,
  DividerList,
  EmptyState,
  Pill
} from "@/app/_ui/primitives";
import { AdminHeader } from "../_components/AdminHeader";

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

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      advertiser: {
        include: {
          user: { select: { name: true } }
        }
      },
      place: { select: { name: true } },
      _count: {
        select: { missionDays: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <PageShell
      header={
        <AdminHeader
          title="캠페인 관리"
          description="광고주의 미션 캠페인을 관리합니다."
        />
      }
    >
      <div className="space-y-6">
        {/* 등록 버튼 - 필요시 추가 */}
        {/* <div className="flex justify-end">
          <ButtonLink href="/admin/campaigns/new" variant="primary" size="sm">
            새 캠페인 생성
          </ButtonLink>
        </div> */}

        {/* 캠페인 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              캠페인 목록 ({formatNumber(campaigns.length)}개)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {campaigns.length === 0 ? (
                  <EmptyState title="생성된 캠페인이 없습니다." />
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {campaign.name}
                            </div>
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
                          <div className="text-xs text-zinc-400">
                            광고주: {campaign.advertiser.user.name} · 장소: {campaign.place.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            일일 목표: {formatNumber(campaign.dailyTarget)}명 · 보상: {formatKrw(campaign.rewardKrw)}
                          </div>
                          <div className="text-xs text-zinc-500">
                            기간: {formatDate(campaign.startDate)} ~ {formatDate(campaign.endDate)}
                            · 총 예산: {formatKrw(campaign.budgetTotalKrw)}
                          </div>
                          <div className="text-xs text-zinc-500">
                            미션 일수: {formatNumber(campaign._count.missionDays)}일 · 생성: {formatDateTime(campaign.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <ButtonLink href={`/admin/campaigns/${campaign.id}`} variant="secondary" size="sm">
                            상세
                          </ButtonLink>
                          <ButtonLink href={`/admin/reviews?campaignId=${campaign.id}`} variant="secondary" size="sm">
                            검수 대기
                          </ButtonLink>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </DividerList>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
