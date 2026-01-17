import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { getMemberProfileIdByUserId } from "@/server/rewarder/rewarder-profile";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, DividerList, Pill } from "@/app/_ui/primitives";
import { BackButton } from "./BackButton";

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
        take: 3,
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
              {participation.status}
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
            <div className="text-sm text-zinc-300">
              증빙 내용을 입력하고 이미지 또는 동영상 1개를 업로드하세요.
              <br />
              <span className="text-amber-200">주의: 제출 기한({new Date(participation.expiresAt).toLocaleString("ko-KR")})까지 업로드하지 않으면 참여가 취소됩니다.</span>
            </div>
            <form
              action={`/api/member/participations/${participation.id}/evidence`}
              method="post"
              encType="multipart/form-data"
              className="space-y-4"
            >
              <textarea
                name="proofText"
                maxLength={2000}
                placeholder="증빙 내용(선택)"
                className="block w-full rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10"
                rows={4}
              />
              <input
                type="file"
                name="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
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
              {participation.evidences.map((e) => {
                const metadata = e.metadataJson as any;
                const fileUrl = e.fileRef; // fileRef is already a full URL like /api/uploads/reward/participations/...

                return (
                  <div key={e.id} className="py-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Pill tone="neutral">{e.type}</Pill>
                        {metadata?.originalName && (
                          <span className="text-xs text-zinc-500">{metadata.originalName}</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">{new Date(e.createdAt).toLocaleString("ko-KR")}</div>
                    </div>
                    {fileUrl && e.type === "IMAGE" ? (
                      <img
                        src={fileUrl}
                        alt="증빙 이미지"
                        className="max-w-full h-auto rounded-lg border border-white/10"
                        style={{ maxHeight: "300px" }}
                      />
                    ) : fileUrl && e.type === "VIDEO" ? (
                      <video
                        src={fileUrl}
                        controls
                        className="max-w-full h-auto rounded-lg border border-white/10"
                        style={{ maxHeight: "300px" }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </DividerList>
          )}
        </CardBody>
      </Card>

      <div className="flex justify-end mt-6">
        <BackButton />
      </div>
    </PageShell>
  );
}


