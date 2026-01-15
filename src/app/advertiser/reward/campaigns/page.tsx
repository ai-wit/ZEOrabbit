import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "@/app/advertiser/_components/AdvertiserHeader";

export default async function AdvertiserCampaignsPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const productOrders = await prisma.productOrder.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      dailyTarget: true,
      unitPriceKrw: true,
      budgetTotalKrw: true,
      status: true,
      createdAt: true,
      product: {
        select: {
          name: true,
          missionType: true
        }
      },
      place: { select: { name: true } },
      campaign: {
        select: {
          id: true,
          name: true,
          status: true,
          _count: {
            select: {
              missionDays: true
            }
          }
        }
      }
    }
  });

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="구매 상품 목록"
          description="구매한 상품 목록을 확인할 수 있습니다. 캠페인 등록 상태를 함께 표시합니다."
        />
      }
    >
      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">총 {productOrders.length}개</div>
        <DividerList>
          {productOrders.length === 0 ? (
            <EmptyState
              title="아직 구매한 상품이 없습니다."
              description="상품을 구매한 뒤, 매니저가 캠페인을 등록/활성화하면 집행이 시작됩니다."
              action={
                <ButtonLink href="/advertiser/reward/products" variant="primary" size="sm">
                  상품 보러가기
                </ButtonLink>
              }
            />
          ) : (
            productOrders.map((po) => (
              <div key={po.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">{po.product.name}</div>
                    </div>

                    <div className="text-xs text-zinc-400">
                      {po.place.name} · {po.product.missionType} · 일 {po.dailyTarget}건 목표
                    </div>

                    <div className="text-xs text-zinc-400">
                      {new Date(po.startDate).toLocaleDateString("ko-KR")} ~ {new Date(po.endDate).toLocaleDateString("ko-KR")}
                      {" · "}
                      단가 {po.unitPriceKrw.toLocaleString()}원 · 총 예산 {po.budgetTotalKrw.toLocaleString()}원
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      {po.campaign ? (
                        <>
                          <span>{po.campaign._count.missionDays}일차 진행</span>
                          <span>N/A명 참여</span>
                        </>
                      ) : (
                        <span className="text-orange-400">캠페인 미등록</span>
                      )}
                      <span>{new Date(po.createdAt).toLocaleDateString("ko-KR")} 구매</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {po.campaign ? (
                      <ButtonLink href={`/advertiser/reward/campaigns/${po.campaign.id}`} variant="secondary" size="sm">
                        캠페인 상세
                      </ButtonLink>
                    ) : (
                      <div className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-2 rounded text-center">
                        캠페인 대기중
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </DividerList>
      </Card>
    </PageShell>
  );
}


