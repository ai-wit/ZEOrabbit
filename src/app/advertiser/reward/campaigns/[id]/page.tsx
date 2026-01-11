import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, CardHeader, DividerList, Pill } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "@/app/advertiser/_components/AdvertiserHeader";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatKrw(n: number): string {
  return `${formatNumber(n)}원`;
}

export default async function AdvertiserCampaignDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: params.id,
      advertiserId
    },
    include: {
      place: {
        select: { id: true, name: true }
      },
      productOrders: {
        take: 1,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              marketingCopy: true,
              guideText: true,
              unitPriceKrw: true
            }
          }
        }
      },
      missionDays: {
        orderBy: { date: "asc" },
        select: {
          id: true,
          date: true,
          quotaTotal: true,
          status: true,
          _count: {
            select: {
              participations: {
                where: { status: "APPROVED" }
              }
            }
          }
        }
      },
      _count: {
        select: {
          missionDays: true
        }
      }
    }
  });

  if (!campaign) {
    notFound();
  }

  const totalTarget = campaign.missionDays.reduce((sum, day) => sum + day.quotaTotal, 0);
  const totalCompleted = campaign.missionDays.reduce((sum, day) => sum + day._count.participations, 0);
  const completionRate = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  const today = new Date();
  const currentDay = campaign.missionDays.find(day =>
    day.date.toDateString() === today.toDateString()
  );

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title={campaign.name}
          description={`${campaign.place.name} · ${campaign.missionType} 캠페인`}
        />
      }
    >
      <div className="space-y-6">
        {/* 캠페인 개요 */}
        <Card>
          <CardHeader
            title="캠페인 개요"
            right={
              <div className="flex items-center gap-3">
                <Pill tone={campaign.status === "ACTIVE" ? "emerald" : campaign.status === "DRAFT" ? "cyan" : campaign.status === "PAUSED" ? "neutral" : "indigo"}>
                  {campaign.status}
                </Pill>
              </div>
            }
          />
          <CardBody className="space-y-4">
            {campaign.productOrders[0]?.product && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-zinc-50">구매 상품</div>
                <div className="text-sm text-zinc-300">{campaign.productOrders[0].product.name}</div>
                {campaign.productOrders[0].product.marketingCopy && (
                  <div className="text-xs text-zinc-400">{campaign.productOrders[0].product.marketingCopy}</div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-zinc-400">플레이스</div>
                <div className="text-zinc-50 font-medium">{campaign.place.name}</div>
              </div>
              <div>
                <div className="text-zinc-400">미션 타입</div>
                <div className="text-zinc-50 font-medium">{campaign.missionType}</div>
              </div>
              <div>
                <div className="text-zinc-400">일일 목표</div>
                <div className="text-zinc-50 font-medium">{campaign.dailyTarget}건</div>
              </div>
              <div>
                <div className="text-zinc-400">진행 기간</div>
                <div className="text-zinc-50 font-medium">
                  {new Date(campaign.startDate).toLocaleDateString("ko-KR")} ~
                  {new Date(campaign.endDate).toLocaleDateString("ko-KR")}
                </div>
              </div>
              <div>
                <div className="text-zinc-400">단가</div>
                <div className="text-zinc-50 font-medium">{formatKrw(campaign.unitPriceKrw)}</div>
              </div>
              <div>
                <div className="text-zinc-400">리워드</div>
                <div className="text-zinc-50 font-medium">{formatKrw(campaign.rewardKrw)}</div>
              </div>
              <div>
                <div className="text-zinc-400">총 참여자</div>
                <div className="text-zinc-50 font-medium">N/A명</div>
              </div>
              <div>
                <div className="text-zinc-400">진행률</div>
                <div className="text-zinc-50 font-medium">{completionRate}%</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 오늘의 미션 */}
        {currentDay && (
          <Card>
            <CardHeader title="오늘의 미션" />
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-zinc-50">
                    {new Date(currentDay.date).toLocaleDateString("ko-KR")} ({currentDay.status})
                  </div>
                  <div className="text-xs text-zinc-400">
                    목표: {currentDay.quotaTotal}건 · 완료: {currentDay._count.participations}건
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-zinc-50">
                    {currentDay.quotaTotal > 0 ? Math.round((currentDay._count.participations / currentDay.quotaTotal) * 100) : 0}%
                  </div>
                  <div className="text-xs text-zinc-400">달성률</div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 미션 진행 현황 */}
        <Card>
          <CardHeader title="미션 진행 현황" />
          <CardBody>
            <div className="space-y-3">
              {campaign.missionDays.slice(0, 7).map((day) => (
                <div key={day.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-zinc-50 w-20">
                      {new Date(day.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </div>
                    <Pill tone={day.status === "ENDED" ? "emerald" : day.status === "ACTIVE" ? "cyan" : "neutral"}>
                      {day.status}
                    </Pill>
                  </div>
                  <div className="text-sm text-zinc-300">
                    {day._count.participations} / {day.quotaTotal}건
                  </div>
                  <div className="text-sm text-zinc-400 w-12 text-right">
                    {day.quotaTotal > 0 ? Math.round((day._count.participations / day.quotaTotal) * 100) : 0}%
                  </div>
                </div>
              ))}
              {campaign.missionDays.length > 7 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-zinc-500">
                    총 {campaign._count.missionDays}일 중 최근 7일 표시
                  </span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* 참여자 현황 */}
        <Card>
          <CardHeader title="참여자 현황" />
          <CardBody>
            <div className="text-center py-8 text-sm text-zinc-400">
              참여자 상세 정보는 추후 제공 예정입니다.
            </div>
          </CardBody>
        </Card>

        {/* 네비게이션 */}
        <div className="flex flex-wrap gap-3">
          <Link href="/advertiser/reward/campaigns" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            ← 캠페인 목록
          </Link>
          <Link href="/advertiser/reward/products" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            상품 구매하기 →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}