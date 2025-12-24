import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, DividerList, Pill } from "@/app/_ui/primitives";

export default async function RewarderParticipationDetailPage(props: {
  params: { id: string };
}) {
  const user = await requireRole("MEMBER");
  const rewarderId = await getMemberProfileIdByUserId(user.id);

  const participation = await prisma.participation.findFirst({
    where: { id: props.params.id, rewarderId },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      submittedAt: true,
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
      },
      evidences: { orderBy: { createdAt: "desc" }, take: 3, select: { id: true, type: true, createdAt: true } }
    }
  });

  if (!participation) notFound();

  const now = Date.now();
  const expired = now > new Date(participation.expiresAt).getTime();

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="REWARDER"
          title="미션 상세"
          description={`${participation.missionDay.campaign.place.name} · ${participation.missionDay.campaign.missionType} · 리워드 ${participation.missionDay.campaign.rewardKrw}원`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/rewarder/missions" variant="secondary" size="sm">
                오늘의 미션
              </ButtonLink>
              <ButtonLink href="/rewarder/participations" variant="secondary" size="sm">
                내 참여 내역
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
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-zinc-50">상태</div>
            <Pill tone={participation.status === "APPROVED" ? "emerald" : participation.status === "REJECTED" ? "red" : "cyan"}>
              {participation.status}
            </Pill>
            {expired ? <Pill tone="red">만료됨</Pill> : null}
          </div>
          <div className="text-xs text-zinc-500">
            만료: {new Date(participation.expiresAt).toLocaleString("ko-KR")}
            {participation.submittedAt ? ` · 제출: ${new Date(participation.submittedAt).toLocaleString("ko-KR")}` : ""}
          </div>
          {participation.failureReason ? <div className="text-xs text-red-200">사유: {participation.failureReason}</div> : null}
        </CardBody>
      </Card>

      {participation.status === "IN_PROGRESS" && !expired ? (
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">인증 제출</div>
            <div className="text-sm text-zinc-300">인증 스크린샷 1장을 업로드하세요.</div>
            <form
              action={`/api/rewarder/participations/${participation.id}/evidence`}
              method="post"
              encType="multipart/form-data"
              className="space-y-4"
            >
              <input
                type="file"
                name="screenshot"
                accept="image/png,image/jpeg,image/webp"
                required
                className="block w-full rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-sm text-zinc-200 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-50 hover:file:bg-white/15"
              />
              <Button type="submit" variant="primary" className="w-full">
                인증 제출
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm font-semibold text-zinc-50">최근 증빙</div>
          {participation.evidences.length === 0 ? (
            <div className="text-sm text-zinc-400">아직 업로드된 증빙이 없습니다.</div>
          ) : (
            <DividerList>
              {participation.evidences.map((e) => (
                <div key={e.id} className="py-3 text-sm text-zinc-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Pill tone="neutral">{e.type}</Pill>
                    </div>
                    <div className="text-xs text-zinc-500">{new Date(e.createdAt).toLocaleString("ko-KR")}</div>
                  </div>
                </div>
              ))}
            </DividerList>
          )}
        </CardBody>
      </Card>
    </PageShell>
  );
}


