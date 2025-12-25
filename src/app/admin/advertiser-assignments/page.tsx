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

export default async function AdvertiserAssignmentsPage() {

  const assignments = await prisma.advertiserManager.findMany({
    where: { isActive: true },
    include: {
      advertiser: {
        include: {
          user: { select: { name: true, email: true } },
          places: { select: { id: true } },
          campaigns: { select: { id: true, status: true } }
        }
      },
      manager: { select: { name: true, email: true } },
      assignedByUser: { select: { name: true } }
    },
    orderBy: { assignedAt: "desc" }
  });

  // 통계 계산
  const totalAssignments = assignments.length;
  const activeCampaigns = assignments.reduce((sum, assignment) =>
    sum + assignment.advertiser.campaigns.filter(c => c.status === "ACTIVE").length, 0
  );
  const totalPlaces = assignments.reduce((sum, assignment) =>
    sum + assignment.advertiser.places.length, 0
  );

  return (
    <PageShell
      header={
        <AdminHeader
          title="광고주-매니저 배정 관리"
          description="광고주와 매니저 간의 배정 관계를 관리합니다."
        />
      }
    >
      <div className="space-y-6">
        {/* 등록 버튼 - 배정 관리에서는 필요 없음 */}
        {/* 통계 카드 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-zinc-50">{formatNumber(totalAssignments)}</div>
              <div className="text-sm text-zinc-400">총 배정 수</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-zinc-50">{formatNumber(activeCampaigns)}</div>
              <div className="text-sm text-zinc-400">활성 캠페인</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-2xl font-bold text-zinc-50">{formatNumber(totalPlaces)}</div>
              <div className="text-sm text-zinc-400">등록 장소</div>
            </CardBody>
          </Card>
        </div>

        {/* 배정 목록 */}
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">
              배정 목록 ({formatNumber(assignments.length)}개)
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
              <DividerList>
                {assignments.length === 0 ? (
                  <EmptyState title="배정된 관계가 없습니다." />
                ) : (
                  assignments.map((assignment) => (
                    <div key={assignment.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-zinc-50">
                              {assignment.advertiser.user.name}
                            </div>
                            <Pill tone="cyan">광고주</Pill>
                            <span className="text-xs text-zinc-400">→</span>
                            <div className="text-sm font-semibold text-zinc-50">
                              {assignment.manager.name}
                            </div>
                            <Pill tone="indigo">매니저</Pill>
                          </div>
                          <div className="text-xs text-zinc-400">
                            광고주: {assignment.advertiser.user.email} · 매니저: {assignment.manager.email}
                          </div>
                          <div className="text-xs text-zinc-500">
                            장소: {formatNumber(assignment.advertiser.places.length)}개 · 캠페인: {formatNumber(assignment.advertiser.campaigns.length)}개
                            (활성: {formatNumber(assignment.advertiser.campaigns.filter(c => c.status === "ACTIVE").length)}개)
                          </div>
                          <div className="text-xs text-zinc-500">
                            배정자: {assignment.assignedByUser.name} · 배정일: {formatDateTime(assignment.assignedAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <ButtonLink href={`/admin/advertisers/${assignment.advertiserId}`} variant="secondary" size="sm">
                            광고주 상세
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
