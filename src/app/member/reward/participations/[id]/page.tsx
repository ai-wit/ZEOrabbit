import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Pill } from "@/app/_ui/primitives";
import { BackButton } from "./BackButton";
import { getParticipationStatusLabel } from "@/lib/status-labels";
import { EvidenceUploadForm } from "./EvidenceUploadForm";
import { EvidenceList } from "./EvidenceList";

function getMissionTypeLabel(missionType: string) {
  switch (missionType) {
    case "TRAFFIC": return "방문 미션";
    case "SAVE": return "저장 미션";
    case "SHARE": return "공유 미션";
    default: return missionType;
  }
}

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
      proofText: true,
      missionDay: {
        select: {
          date: true,
          campaign: {
            select: {
              missionType: true,
              rewardKrw: true,
              missionText: true,
              place: { select: { name: true } },
              buttons: {
                select: {
                  id: true,
                  label: true,
                  url: true,
                  sortOrder: true
                },
                orderBy: { sortOrder: "asc" }
              }
            }
          }
        }
      },
      evidences: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          fileRef: true,
          metadataJson: true,
          createdAt: true
        }
      }
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
      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-zinc-50">상태</div>
            <Pill tone={participation.status === "APPROVED" ? "emerald" : participation.status === "REJECTED" ? "red" : "cyan"}>
              {getParticipationStatusLabel(participation.status)}
            </Pill>
            {expired ? <Pill tone="red">만료됨</Pill> : null}
          </div>
          <div className="text-xs text-zinc-500">
            만료: {new Date(participation.expiresAt).toLocaleString("ko-KR")}
            {participation.submittedAt ? ` · 제출: ${new Date(participation.submittedAt).toLocaleString("ko-KR")}` : ""}
          </div>
          {participation.failureReason ? <div className="text-xs text-red-200">사유: {participation.failureReason}</div> : null}
          {participation.proofText ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-zinc-50">제출 내용</div>
              <div className="text-sm text-zinc-300 whitespace-pre-wrap">{participation.proofText}</div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm font-semibold text-zinc-50">미션 정보</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-zinc-500">미션 타입</div>
              <Pill tone="neutral">{getMissionTypeLabel(participation.missionDay.campaign.missionType)}</Pill>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-zinc-500">리워드</div>
              <div className="text-sm font-semibold text-emerald-400">{participation.missionDay.campaign.rewardKrw.toLocaleString()}원</div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="text-xs text-zinc-500">장소</div>
              <div className="text-sm text-zinc-300">{participation.missionDay.campaign.place.name}</div>
            </div>
            {participation.missionDay.campaign.missionText && (
              <div className="space-y-2 md:col-span-2">
                <div className="text-xs text-zinc-500">미션 설명</div>
                <div className="text-sm text-zinc-300 whitespace-pre-wrap">{participation.missionDay.campaign.missionText}</div>
              </div>
            )}
            {participation.missionDay.campaign.buttons.length > 0 && (
              <div className="space-y-2 md:col-span-2">
                <div className="text-xs text-zinc-500">미션 버튼</div>
                <div className="flex flex-wrap gap-2">
                  {participation.missionDay.campaign.buttons.map((button) => (
                    <a
                      key={button.id}
                      href={button.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/5 text-zinc-50 hover:bg-white/10 font-semibold transition"
                    >
                      {button.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {participation.status === "IN_PROGRESS" && !expired ? (
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">인증 제출</div>
            <EvidenceUploadForm
              action={`/api/member/participations/${participation.id}/evidence`}
              expiresAtLabel={new Date(participation.expiresAt).toLocaleString("ko-KR")}
            />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm font-semibold text-zinc-50">최근 증빙</div>
          <EvidenceList evidences={participation.evidences} />
        </CardBody>
      </Card>

      <div className="flex justify-end mt-6">
        <BackButton />
      </div>
    </PageShell>
  );
}


