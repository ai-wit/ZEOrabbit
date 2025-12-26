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

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

export default async function ExperienceCampaignsPage() {
  const campaigns = await prisma.experienceCampaign.findMany({
    include: {
      advertiser: {
        include: {
          user: { select: { name: true } }
        }
      },
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
        <AdminHeader
          title="체험단 공고 관리"
          description="체험단 모집 공고를 생성하고 관리합니다."
        />
      }
    >
      <div className="space-y-6">
        {/* 등록 버튼 */}
        <div className="flex justify-end">
          <ButtonLink href="/admin/experience/new" variant="primary" size="sm">
            새 공고 생성
          </ButtonLink>
        </div>

        {/* 공고 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              체험단 공고 목록 ({formatNumber(campaigns.length)}개)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {campaigns.length === 0 ? (
                  <EmptyState title="생성된 공고가 없습니다." />
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {campaign.title}
                            </div>
                            <Pill tone={
                              campaign.status === "ACTIVE" ? "emerald" :
                              campaign.status === "DRAFT" ? "cyan" : "neutral"
                            }>
                              {campaign.status === "ACTIVE" ? "활성" :
                               campaign.status === "DRAFT" ? "초안" : "종료"}
                            </Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            광고주: {campaign.advertiser.user.name} · 장소: {campaign.place.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            팀 현황: {formatNumber(campaign._count.teams)} / {formatNumber(campaign.targetTeamCount)}팀
                            · 최대 {formatNumber(campaign.maxMembersPerTeam)}명
                          </div>
                          <div className="text-xs text-zinc-500">
                            신청 마감: {formatDateTime(campaign.applicationDeadline)} · 생성: {formatDateTime(campaign.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <ButtonLink href={`/admin/experience/${campaign.id}`} variant="secondary" size="sm">
                            상세
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
