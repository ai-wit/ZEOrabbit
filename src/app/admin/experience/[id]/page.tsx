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
  Pill
} from "@/app/_ui/primitives";
import { AdminHeader } from "../../_components/AdminHeader";
import { notFound } from "next/navigation";

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

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

export default async function ExperienceCampaignDetailPage(props: {
  params: { id: string };
}) {
  const campaign = await prisma.experienceCampaign.findUnique({
    where: { id: props.params.id },
    include: {
      manager: {
        select: {
          user: { select: { email: true, name: true } }
        }
      },
      advertiser: {
        include: {
          user: { select: { name: true, email: true } }
        }
      },
      place: { select: { name: true } },
      teams: {
        include: {
          leader: {
            select: {
              user: { select: { email: true, name: true } }
            }
          },
          _count: {
            select: { memberships: true }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      _count: {
        select: { teams: true }
      }
    }
  });

  if (!campaign) {
    notFound();
  }

  return (
    <PageShell
      header={
        <AdminHeader
          title={`${campaign.place.name} 체험단 공고`}
          description={`${campaign.title} - ${campaign.manager.user.name ?? campaign.manager.user.email} 담당`}
        />
      }
    >
      <div className="space-y-6">
        {/* 공고 기본 정보 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-50">{campaign.title}</div>
                <div className="text-xs text-zinc-400">
                  담당 매니저: {campaign.manager.user.name ?? campaign.manager.user.email}
                </div>
              </div>
              <Pill tone={
                campaign.status === "ACTIVE" ? "emerald" :
                campaign.status === "DRAFT" ? "cyan" : "neutral"
              }>
                {campaign.status === "ACTIVE" ? "활성" :
                 campaign.status === "DRAFT" ? "초안" : "종료"}
              </Pill>
            </div>

            {campaign.description && (
              <div className="text-sm text-zinc-300 whitespace-pre-wrap">
                {campaign.description}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <KeyValueRow k="광고주" v={campaign.advertiser.user.name ?? campaign.advertiser.user.email} />
              <KeyValueRow k="장소" v={campaign.place.name} />
              <KeyValueRow k="신청 마감" v={formatDateTime(campaign.applicationDeadline)} />
              <KeyValueRow k="체험 기간" v={`${formatDate(campaign.startDate)} ~ ${formatDate(campaign.endDate)}`} />
              <KeyValueRow k="목표 팀 수" v={`${formatNumber(campaign.targetTeamCount)}팀`} />
              <KeyValueRow k="팀당 최대 인원" v={`${formatNumber(campaign.maxMembersPerTeam)}명`} />
              <KeyValueRow k="생성일" v={formatDateTime(campaign.createdAt)} />
              <KeyValueRow k="수정일" v={formatDateTime(campaign.updatedAt)} />
            </div>
          </CardBody>
        </Card>

        {/* 팀 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-50">
                참여 팀 목록 ({formatNumber(campaign._count.teams)}팀)
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {campaign.teams.length === 0 ? (
                  <EmptyState title="아직 참여한 팀이 없습니다." />
                ) : (
                  campaign.teams.map((team) => (
                    <div key={team.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {team.name}
                            </div>
                            <Pill tone={
                              team.status === "ACTIVE" ? "emerald" :
                              team.status === "FORMING" ? "cyan" :
                              team.status === "COMPLETED" ? "indigo" : "neutral"
                            }>
                              {team.status === "ACTIVE" ? "활성" :
                               team.status === "FORMING" ? "구성중" :
                               team.status === "COMPLETED" ? "완료" : "취소"}
                            </Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            팀장: {team.leader.user.name ?? team.leader.user.email}
                          </div>
                          {team.description && (
                            <div className="text-xs text-zinc-500">
                              {team.description}
                            </div>
                          )}
                          <div className="text-xs text-zinc-500">
                            멤버 수: {formatNumber(team._count.memberships)}명 · 생성: {formatDateTime(team.createdAt)}
                          </div>
                        </div>
                        <ButtonLink href={`/admin/teams/${team.id}`} variant="secondary" size="sm">
                          팀 상세
                        </ButtonLink>
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
          <ButtonLink href="/admin/experience" variant="secondary" size="sm">
            목록으로 돌아가기
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
