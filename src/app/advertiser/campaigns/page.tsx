import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "../_components/AdvertiserHeader";

export default async function AdvertiserCampaignsPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      missionType: true,
      dailyTarget: true,
      startDate: true,
      endDate: true,
      unitPriceKrw: true,
      rewardKrw: true,
      status: true,
      createdAt: true,
      productOrder: {
        select: {
          product: {
            select: {
              name: true,
              missionType: true
            }
          }
        }
      },
      place: { select: { name: true } },
      _count: {
        select: {
          missionDays: true,
          members: true
        }
      }
    }
  });

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="집행 현황"
          description="상품 구매로 생성된 캠페인을 확인할 수 있습니다."
        />
      }
    >
      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">총 {campaigns.length}개</div>
        <DividerList>
          {campaigns.length === 0 ? (
            <EmptyState
              title="아직 캠페인이 없습니다."
              description="상품을 구매하면 캠페인이 자동 생성됩니다."
              action={
                <ButtonLink href="/advertiser/products" variant="primary" size="sm">
                  상품 보러가기
                </ButtonLink>
              }
            />
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">{c.name}</div>
                      <Pill tone={c.status === "ACTIVE" ? "emerald" : c.status === "DRAFT" ? "cyan" : c.status === "PAUSED" ? "yellow" : "indigo"}>
                        {c.status}
                      </Pill>
                    </div>

                    {c.productOrder?.product && (
                      <div className="text-xs text-zinc-500">
                        상품: {c.productOrder.product.name} ({c.productOrder.product.missionType})
                      </div>
                    )}

                    <div className="text-xs text-zinc-400">
                      {c.place.name} · {c.missionType} · 일 {c.dailyTarget}건 목표
                    </div>

                    <div className="text-xs text-zinc-400">
                      {new Date(c.startDate).toLocaleDateString("ko-KR")} ~ {new Date(c.endDate).toLocaleDateString("ko-KR")}
                      {" · "}
                      단가 {c.unitPriceKrw.toLocaleString()}원 · 리워드 {c.rewardKrw.toLocaleString()}원
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span>{c._count.missionDays}일차 진행</span>
                      <span>{c._count.members}명 참여</span>
                      <span>{new Date(c.createdAt).toLocaleDateString("ko-KR")} 생성</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {c.status === "DRAFT" || c.status === "PAUSED" ? (
                      <form action={`/api/advertiser/campaigns/${c.id}/activate`} method="post">
                        <Button type="submit" variant="primary" size="sm">
                          활성화
                        </Button>
                      </form>
                    ) : null}

                    <ButtonLink href={`/advertiser/campaigns/${c.id}`} variant="outline" size="sm">
                      상세보기
                    </ButtonLink>
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


