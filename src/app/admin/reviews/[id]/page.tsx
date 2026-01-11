import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/server/auth/require-user";
import { prisma } from "@/server/prisma";
import { PageHeader, PageShell } from "@/app/_ui/shell";
import { Button, ButtonLink, Card, CardBody, Input, Pill } from "@/app/_ui/primitives";
import { ImageLightbox } from "@/app/_ui/ImageLightbox";

export default async function AdminReviewDetailPage(props: { params: { id: string } }) {
  const admin = await requireRole("ADMIN");

  const participation = await prisma.participation.findUnique({
    where: { id: props.params.id },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      decidedAt: true,
      failureReason: true,
      rewarder: { select: { id: true, user: { select: { email: true } } } },
      missionDay: {
        select: {
          date: true,
          campaign: {
            select: {
              id: true,
              missionType: true,
              unitPriceKrw: true,
              rewardKrw: true,
              advertiser: { select: { id: true, user: { select: { email: true } } } },
              place: { select: { name: true } }
            }
          }
        }
      },
      evidences: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, type: true, fileRef: true, createdAt: true }
      }
    }
  });

  if (!participation) notFound();

  const evidence = participation.evidences[0] ?? null;
  const evidenceSrc = evidence?.fileRef ? evidence.fileRef.trim() : null;
  const isVideo = evidence?.type === "VIDEO";

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="ADMIN"
          title="검수 상세"
          description={`관리자: ${admin.email ?? admin.id}`}
          right={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/reviews" variant="secondary" size="sm">
                목록
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
            <div className="text-sm font-semibold text-zinc-50">
              {participation.missionDay.campaign.place.name} · {participation.missionDay.campaign.missionType}
            </div>
            <Pill tone={participation.status === "PENDING_REVIEW" ? "cyan" : "indigo"}>{participation.status}</Pill>
          </div>
          <div className="text-xs text-zinc-400">
            참여자: {participation.rewarder.user.email ?? participation.rewarder.id} · 광고주:{" "}
            {participation.missionDay.campaign.advertiser.user.email ??
              participation.missionDay.campaign.advertiser.id}
          </div>
          <div className="text-xs text-zinc-500">
            {participation.submittedAt ? `제출: ${new Date(participation.submittedAt).toLocaleString("ko-KR")}` : "제출: —"}
            {participation.decidedAt ? ` · 결정: ${new Date(participation.decidedAt).toLocaleString("ko-KR")}` : ""}
          </div>
          {participation.failureReason ? <div className="text-xs text-red-200">사유: {participation.failureReason}</div> : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-zinc-50">증빙(최근 1개)</div>
            {evidenceSrc ? <ImageLightbox src={evidenceSrc} /> : null}
          </div>
          {evidenceSrc ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60">
              <div className="flex h-[52vh] min-h-[240px] max-h-[520px] w-full items-center justify-center bg-white/[0.02] p-3">
                {isVideo ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={evidenceSrc}
                    controls
                    preload="metadata"
                    className="h-full w-full rounded-xl object-contain"
                  />
                ) : (
                  <ImageLightbox
                    src={evidenceSrc}
                    className="h-full w-full rounded-xl"
                    trigger={
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={evidenceSrc}
                        alt="evidence"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full rounded-xl object-contain"
                      />
                    }
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-400">증빙이 없습니다.</div>
          )}
        </CardBody>
      </Card>

      {participation.status === "PENDING_REVIEW" || participation.status === "MANUAL_REVIEW" ? (
        <Card>
          <CardBody className="space-y-4">
            <div className="text-sm font-semibold text-zinc-50">처리</div>
            <div className="grid gap-3 md:grid-cols-2 md:items-center">
              <form action={`/api/admin/participations/${participation.id}/approve`} method="post" className="md:justify-self-start">
                <Button type="submit" variant="primary" className="w-full md:w-auto">
                  승인
                </Button>
              </form>
              <form
                action={`/api/admin/participations/${participation.id}/reject`}
                method="post"
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <Input name="reason" placeholder="반려 사유" maxLength={200} required className="w-full sm:w-auto sm:flex-1" />
                <Button type="submit" variant="danger" className="w-full sm:w-auto">
                  반려
                </Button>
              </form>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </PageShell>
  );
}


