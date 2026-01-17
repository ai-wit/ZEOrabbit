import Link from "next/link";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, DividerList, EmptyState, Pill } from "@/app/_ui/primitives";
import { RewardNavigation } from "../_components/RewardNavigation";

export default async function MemberRewardCampaignsPage() {
  const user = await requireRole("MEMBER");
  const today = toDateOnlyUtc(new Date());

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: today },
      endDate: { gte: today },
      missionDays: {
        some: {
          date: today,
          status: "ACTIVE"
        }
      }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      missionType: true,
      rewardKrw: true,
      startDate: true,
      endDate: true,
      place: { select: { name: true } },
      missionDays: { where: { date: today }, select: { quotaRemaining: true, quotaTotal: true, status: true } }
    }
  });

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="REWARDER"
          title="캠페인"
          description={`${user.email ?? user.id}`}
          right={<RewardNavigation />}
        />
      }
    >
      <Card>
        <div className="border-b border-white/10 px-6 py-4 text-sm text-zinc-300">총 {campaigns.length}개</div>
        <DividerList>
          {campaigns.length === 0 ? (
            <EmptyState title="현재 참여 가능한 캠페인이 없습니다." />
          ) : (
            campaigns.map((c) => {
              const md = c.missionDays[0] ?? null;
              return (
                <div key={c.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-zinc-50">{c.place.name}</div>
                      <div className="text-xs text-zinc-400">
                        {c.name} · {c.missionType} · 리워드 {c.rewardKrw}원
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(c.startDate).toLocaleDateString("ko-KR")} ~ {new Date(c.endDate).toLocaleDateString("ko-KR")}
                      </div>
                      <div className="text-xs text-zinc-500">
                        오늘 잔여 {md ? `${md.quotaRemaining} / ${md.quotaTotal}` : "—"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {md && md.quotaRemaining <= 0 ? <Pill tone="neutral">수량 소진</Pill> : null}
                      <a
                        href={`/member/reward/campaigns/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/5 text-zinc-50 hover:bg-white/10 font-semibold transition"
                      >
                        상세
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </DividerList>
      </Card>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/member/reward/missions" className="text-sm text-zinc-300 hover:underline underline-offset-4">
          오늘의 미션 →
        </Link>
      </div>
    </PageShell>
  );
}


