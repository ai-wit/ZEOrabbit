import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getAdvertiserProfileIdByUserId } from "@/server/advertiser/advertiser-profile";
import { PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";
import { AdvertiserHeader } from "../_components/AdvertiserHeader";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatKrw(n: number): string {
  return `${formatNumber(n)}원`;
}

export default async function AdvertiserExperienceCampaignsPage() {
  const user = await requireRole("ADVERTISER");
  const advertiserId = await getAdvertiserProfileIdByUserId(user.id);

  const experienceCampaigns = await prisma.experienceCampaign.findMany({
    where: { advertiserId },
    include: {
      place: { select: { name: true } },
      _count: {
        select: { teams: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="체험단 관리"
          description="체험단 모집 공고를 생성하고 관리합니다."
        />
      }
    >
      <div className="mb-6 flex justify-end">
        <ButtonLink href="/advertiser/experience/new" variant="primary" size="sm">
          새 체험단 공고
        </ButtonLink>
      </div>
      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">
          총 {experienceCampaigns.length}개
        </div>
        <DividerList>
          {experienceCampaigns.length === 0 ? (
            <EmptyState
              title="아직 체험단 공고가 없습니다."
              description="새로운 체험단 공고를 생성해보세요."
              action={
                <ButtonLink href="/advertiser/experience/new" variant="primary" size="sm">
                  체험단 공고 생성
                </ButtonLink>
              }
            />
          ) : (
            experienceCampaigns.map((campaign) => (
              <div key={campaign.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">{campaign.title}</div>
                      <Pill tone={campaign.status === "ACTIVE" ? "emerald" : "neutral"}>
                        {campaign.status}
                      </Pill>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {campaign.place.name} · 신청팀 {formatNumber(campaign._count.teams)}팀
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(campaign.startDate).toLocaleDateString("ko-KR")} ~{" "}
                      {new Date(campaign.endDate).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <ButtonLink href={`/advertiser/experience/${campaign.id}`} variant="secondary" size="sm">
                    관리
                  </ButtonLink>
                </div>
              </div>
            ))
          )}
        </DividerList>
      </Card>
    </PageShell>
  );
}
