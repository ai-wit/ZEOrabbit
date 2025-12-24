import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";

export default async function RewarderParticipationsPage() {
  const user = await requireRole("MEMBER");
  const rewarderId = await getMemberProfileIdByUserId(user.id);

  const participations = await prisma.participation.findMany({
    where: { rewarderId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      submittedAt: true,
      decidedAt: true,
      failureReason: true,
      missionDay: {
        select: {
          date: true,
          campaign: {
            select: {
              missionType: true,
              rewardKrw: true,
              place: { select: { name: true } }
            }
          }
        }
      }
    }
  });

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="REWARDER"
          title="내 참여 내역"
          description="최근 50건까지 표시합니다."
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/rewarder/missions" variant="secondary" size="sm">
                오늘의 미션
              </ButtonLink>
              <ButtonLink href="/rewarder/payouts" variant="secondary" size="sm">
                출금/정산
              </ButtonLink>
              <ButtonLink href="/rewarder" variant="secondary" size="sm">
                리워더 홈
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
        <DividerList>
          {participations.length === 0 ? (
            <EmptyState title="참여 내역이 없습니다." />
          ) : (
            participations.map((p) => (
              <div key={p.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-50">{p.missionDay.campaign.place.name}</div>
                      <Pill tone="cyan">{p.status}</Pill>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {p.missionDay.campaign.missionType} · 리워드 {p.missionDay.campaign.rewardKrw}원 · 집행일{" "}
                      {new Date(p.missionDay.date).toLocaleDateString("ko-KR")}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {p.failureReason ? `사유: ${p.failureReason}` : null}
                    </div>
                    <div className="text-xs text-zinc-500">
                      생성 {new Date(p.createdAt).toLocaleString("ko-KR")} · 만료 {new Date(p.expiresAt).toLocaleString("ko-KR")}
                      {p.submittedAt ? ` · 제출 ${new Date(p.submittedAt).toLocaleString("ko-KR")}` : ""}
                      {p.decidedAt ? ` · 결정 ${new Date(p.decidedAt).toLocaleString("ko-KR")}` : ""}
                    </div>
                  </div>

                  <ButtonLink href={`/rewarder/participations/${p.id}`} variant="secondary" size="sm">
                    상세
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


