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

  // 체험단 캠페인 조회
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

  // 완료된 체험단 신청도 조회 (캠페인이 아직 생성되지 않은 경우)
  const completedApplications = await prisma.experienceApplication.findMany({
    where: {
      advertiserId,
      status: 'COMPLETED'
    },
    include: {
      pricingPlan: {
        select: { displayName: true }
      }
    },
    orderBy: { completedAt: "desc" }
  });

  return (
    <PageShell
      header={
        <AdvertiserHeader
          title="체험단 관리"
          description="체험단을 신청하고 결과를 확인 하실 수 있습니다."
        />
      }
    >
      <div className="mb-6 flex justify-end">
        <ButtonLink href="/advertiser/experience/new" variant="primary" size="sm">
          새 체험단 신청
        </ButtonLink>
      </div>
      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">
          총 {experienceCampaigns.length + completedApplications.length}개
        </div>
        <DividerList>
          {experienceCampaigns.length === 0 && completedApplications.length === 0 ? (
            <EmptyState
              title="아직 체험단 공고가 없습니다."
            />
          ) : (
            <>
              {/* 진행 중인 체험단 캠페인 */}
              {experienceCampaigns.map((campaign) => (
                <div key={campaign.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-zinc-50">{campaign.title}</div>
                        <Pill tone={campaign.status === "ACTIVE" ? "emerald" : "neutral"}>
                          {campaign.status}
                        </Pill>
                        <Pill tone="cyan">캠페인</Pill>
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
              ))}

              {/* 완료된 체험단 신청 */}
              {completedApplications.map((application) => (
                <div key={application.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-zinc-50">
                          {application.pricingPlan?.displayName} 체험단 신청
                        </div>
                        <Pill tone="cyan">신청완료</Pill>
                        <Pill tone="neutral">관리자 승인대기</Pill>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {application.businessName || '장소 정보 없음'}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {application.completedAt ? new Date(application.completedAt).toLocaleDateString("ko-KR") : '완료일 정보 없음'}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400">
                      관리자 승인 후 체험단이 시작됩니다.
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </DividerList>
      </Card>
    </PageShell>
  );
}
