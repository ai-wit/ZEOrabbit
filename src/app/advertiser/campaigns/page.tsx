import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";

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
      place: { select: { name: true } }
    }
  });

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="ADVERTISER"
          title="캠페인 관리"
          description="DRAFT로 생성 후 활성화하면 일별 미션이 생성됩니다."
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/advertiser/campaigns/new" variant="primary" size="sm">
                새 캠페인
              </ButtonLink>
              <ButtonLink href="/advertiser/places" variant="secondary" size="sm">
                플레이스
              </ButtonLink>
              <ButtonLink href="/advertiser/reports" variant="secondary" size="sm">
                리포트
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
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">총 {campaigns.length}개</div>
        <DividerList>
          {campaigns.length === 0 ? (
            <EmptyState title="아직 캠페인이 없습니다." />
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">{c.name}</div>
                      <Pill tone={c.status === "ACTIVE" ? "emerald" : c.status === "DRAFT" ? "cyan" : "indigo"}>
                        {c.status}
                      </Pill>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {c.place.name} · {c.missionType} · 일 {c.dailyTarget}건 ·{" "}
                      {new Date(c.startDate).toLocaleDateString("ko-KR")} ~{" "}
                      {new Date(c.endDate).toLocaleDateString("ko-KR")}
                    </div>
                    <div className="text-xs text-zinc-400">
                      단가 {c.unitPriceKrw}원 · 리워드 {c.rewardKrw}원
                    </div>
                  </div>

                  {c.status === "DRAFT" || c.status === "PAUSED" ? (
                    <form action={`/api/advertiser/campaigns/${c.id}/activate`} method="post">
                      <Button type="submit" variant="primary" size="sm">
                        활성화
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </DividerList>
      </Card>
    </PageShell>
  );
}


