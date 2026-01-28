import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { toDateOnlyUtc } from "@/server/date/date-only";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Pill } from "@/app/_ui/primitives";
import { getMissionDayStatusLabel, getParticipationStatusLabel } from "@/lib/status-labels";

export default async function MemberRewardCampaignDetailPage(props: { params: { id: string } }) {
  const user = await requireRole("MEMBER");
  const today = toDateOnlyUtc(new Date());

  const campaign = await prisma.campaign.findUnique({
    where: { id: props.params.id },
    select: {
      id: true,
      name: true,
      missionType: true,
      rewardKrw: true,
      startDate: true,
      endDate: true,
      status: true,
      missionText: true,
      place: { select: { name: true } },
      buttons: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, url: true } },
      missionDays: { where: { date: today }, select: { id: true, quotaRemaining: true, quotaTotal: true, status: true } }
    }
  });
  if (!campaign || campaign.status !== "ACTIVE") notFound();

  const md = campaign.missionDays[0] ?? null;
  const soldOut = md ? md.quotaRemaining <= 0 : true;

  // 사용자의 현재 참여 상태 확인
  const rewarderId = await getMemberProfileIdByUserId(user.id);
  const existingParticipation = md ? await prisma.participation.findFirst({
    where: {
      rewarderId,
      missionDayId: md.id,
      status: { in: ["IN_PROGRESS", "PENDING_REVIEW", "MANUAL_REVIEW"] }
    },
    select: { id: true, status: true, expiresAt: true }
  }) : null;

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="REWARDER"
          title={campaign.place.name}
          description={`${campaign.name} · ${campaign.missionType} · 리워드 ${campaign.rewardKrw}원`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/" variant="secondary" size="sm">
                홈
              </ButtonLink>
              <ButtonLink href="/member/reward" variant="secondary" size="sm">
                리워더 홈
              </ButtonLink>
              <ButtonLink href="/member/reward/missions" variant="secondary" size="sm">
                오늘의 미션
              </ButtonLink>
              <ButtonLink href="/member/reward/campaigns" variant="secondary" size="sm">
                캠페인
              </ButtonLink>
              <ButtonLink href="/member/reward/participations" variant="secondary" size="sm">
                내 참여 내역
              </ButtonLink>
              <ButtonLink href="/member/reward/payouts" variant="secondary" size="sm">
                출금/정산
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
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="cyan">{campaign.missionType}</Pill>
              {md ? <Pill tone={md.status === "ACTIVE" ? "emerald" : "neutral"}>{getMissionDayStatusLabel(md.status)}</Pill> : <Pill tone="neutral">오늘 미션 없음</Pill>}
              {soldOut ? <Pill tone="neutral">수량 소진</Pill> : null}
            </div>
            <div className="text-xs text-zinc-500">
              기간: {new Date(campaign.startDate).toLocaleDateString("ko-KR")} ~ {new Date(campaign.endDate).toLocaleDateString("ko-KR")}
            </div>
            <div className="text-xs text-zinc-500">오늘 잔여: {md ? `${md.quotaRemaining} / ${md.quotaTotal}` : "—"}</div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <div className="text-sm font-semibold text-zinc-50">상세 정보(미션)</div>
            {campaign.missionText ? (
              <div className="whitespace-pre-wrap text-sm text-zinc-300">{campaign.missionText}</div>
            ) : (
              <div className="text-sm text-zinc-400">등록된 상세 정보가 없습니다.</div>
            )}
          </CardBody>
        </Card>

        {campaign.buttons.length > 0 ? (
          <Card>
            <CardBody className="space-y-3">
              <div className="text-sm font-semibold text-zinc-50">추가 옵션</div>
              <div className="flex flex-wrap gap-2">
                {campaign.buttons.map((b) => (
                  <a
                    key={b.id}
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 hover:bg-white/10"
                  >
                    {b.label}
                  </a>
                ))}
              </div>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">참여하기</div>
            {existingParticipation ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pill tone="emerald">이미 참여중</Pill>
                  <Pill tone="cyan">{getParticipationStatusLabel(existingParticipation.status)}</Pill>
                </div>
                <div className="text-sm text-zinc-300">
                  증빙 제출 기한: {new Date(existingParticipation.expiresAt).toLocaleString("ko-KR")}
                </div>
                <ButtonLink href={`/member/reward/participations/${existingParticipation.id}`} variant="secondary" className="w-full">
                  참여 상세 보기
                </ButtonLink>
              </div>
            ) : (
              <>
                <div className="text-sm text-zinc-300">오늘 미션 슬롯을 확보한 뒤 증빙을 제출하세요.</div>
                <form action={`/api/member/reward/campaigns/${campaign.id}/join`} method="post">
                  <Button type="submit" variant="primary" className="w-full" disabled={soldOut || !md}>
                    {soldOut || !md ? "오늘 참여 불가" : "참여하기(슬롯 확보)"}
                  </Button>
                </form>
              </>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href="/member/reward/campaigns" className="text-sm text-zinc-300 hover:underline underline-offset-4">
            ← 캠페인 목록
          </Link>
        </div>
      </div>
    </PageShell>
  );
}


